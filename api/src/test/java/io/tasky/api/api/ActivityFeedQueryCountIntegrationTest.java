package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.activity.ActivityCollaborationService;
import io.tasky.api.api.activity.ActivityCommentResponse;
import io.tasky.api.api.activity.ActivityFeedResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityFeedQueryCountIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private ActivityCollaborationService collaborationService;
    @Autowired private SessionFactory sessionFactory;
    @Autowired private io.tasky.api.domain.activity.ActivityRepository activityRepository;
    @Autowired private io.tasky.api.domain.activity.ActivityCommentRepository commentRepository;
    @Autowired private io.tasky.api.domain.activity.ActivityEventRepository eventRepository;
    @Autowired private io.tasky.api.domain.activity.ActivityCommentMentionRepository mentionRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User user;
    private Organization org;
    private OrganizationMembership membership;
    private String token;
    private UUID activityId;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        user = userService.createUser("fq-" + uid + "@test.com", "sub-fq-" + uid, "Feed", null);
        org = organizationService.createOrganization("FQ Org " + uid, "fq-org-" + uid, user);
        membership = membershipRepository.findByUserIdAndOrganizationId(user.getId(), org.getId()).orElseThrow();
        token = tokenFor(user.getId(), user.getEmail(), org.getId(), Role.admin);

        String deptJson = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", org.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Dept FQ"}
                        """)
                .retrieve()
                .body(String.class);
        String deptId = JsonPath.read(deptJson, "$.id");

        String projectJson = restClient.post()
                .uri("/api/v1/departments/{deptId}/projects", deptId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Projeto FQ"}
                        """)
                .retrieve()
                .body(String.class);
        String projectId = JsonPath.read(projectJson, "$.id");

        String activityJson = restClient.post()
                .uri("/api/v1/projects/{projectId}/activities", projectId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title": "Atividade FQ", "weight": 3,
                         "assignedToMembershipId": "%s",
                         "startDatetime": "2026-06-01T08:00:00Z",
                         "endDatetime": "2026-06-01T09:00:00Z"}
                        """.formatted(membership.getId()))
                .retrieve()
                .body(String.class);
        activityId = UUID.fromString(JsonPath.read(activityJson, "$.id"));

        for (int i = 0; i < 30; i++) {
            collaborationService.addComment(org.getId(), activityId, membership,
                    "Comentario " + i, List.of());
        }
    }

    @AfterEach
    void cleanUp() {
        if (activityId != null) {
            var comments = commentRepository.findByActivityIdOrderByCreatedAtAsc(activityId);
            for (var comment : comments) {
                mentionRepository.deleteAll(
                        mentionRepository.findByCommentIdOrderByCreatedAtAscIdAsc(comment.getId()));
            }
            commentRepository.deleteAll(comments);
            jdbcTemplate.update("DELETE FROM activity_events WHERE activity_id = ?", activityId);
            activityRepository.deleteById(activityId);
        }
        if (org != null) organizationRepository.delete(org);
        if (user != null) userRepository.delete(user);
    }

    @Test
    void commentList_runsInBoundedQueries() {
        sessionFactory.getStatistics().clear();
        List<ActivityCommentResponse> comments =
                collaborationService.getCommentResponses(org.getId(), activityId, membership.getId());
        long queries = sessionFactory.getStatistics().getQueryExecutionCount();

        assertThat(comments).hasSize(30);
        assertThat(queries).as("comment list query count").isLessThanOrEqualTo(6);
    }

    @Test
    void feedList_runsInBoundedQueries() {
        sessionFactory.getStatistics().clear();
        List<ActivityFeedResponse> feed =
                collaborationService.getFeedResponses(org.getId(), activityId, 100, membership.getId());
        long queries = sessionFactory.getStatistics().getQueryExecutionCount();

        assertThat(feed).isNotEmpty();
        assertThat(queries).as("feed list query count").isLessThanOrEqualTo(8);
    }
}
