package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityChecklistItemRepository;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ActivityChecklistAggregateIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private ActivityRepository activityRepository;
    @Autowired private ActivityChecklistItemRepository checklistRepository;

    private String uid;
    private User user;
    private Organization org;
    private OrganizationMembership membership;
    private String token;
    private String deptId;
    private String projectId;

    @BeforeEach
    void setUp() {
        uid = UUID.randomUUID().toString().substring(0, 8);
        user = userService.createUser("chk-" + uid + "@test.com", "sub-chk-" + uid, "Checklist", null);
        org = organizationService.createOrganization("Checklist Org " + uid, "chk-org-" + uid, user);
        membership = membershipRepository.findByUserIdAndOrganizationId(user.getId(), org.getId()).orElseThrow();
        token = tokenFor(user.getId(), user.getEmail(), org.getId(), Role.admin);

        String deptJson = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", org.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Dept Checklist"}
                        """)
                .retrieve()
                .body(String.class);
        deptId = JsonPath.read(deptJson, "$.id");

        String projectJson = restClient.post()
                .uri("/api/v1/departments/{deptId}/projects", deptId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Projeto Checklist", "managerMembershipId": "%s"}
                        """.formatted(membership.getId()))
                .retrieve()
                .body(String.class);
        projectId = JsonPath.read(projectJson, "$.id");
    }

    @AfterEach
    void cleanUp() {
        if (projectId != null && org != null) {
            List<Activity> activities = activityRepository.findByProjectIdAndProject_Department_Organization_Id(UUID.fromString(projectId), org.getId());
            for (Activity activity : activities) {
                checklistRepository.deleteAll(checklistRepository.findByActivityIdOrderByPositionAsc(activity.getId()));
            }
            activityRepository.deleteAll(activities);
        }
        if (org != null) organizationRepository.delete(org);
        if (user != null) userRepository.delete(user);
    }

    private String createActivity(String title) {
        String now = java.time.Instant.now().toString();
        String later = java.time.Instant.now().plusSeconds(3600).toString();
        var response = restClient.post()
                .uri("/api/v1/projects/{projectId}/activities", projectId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title": "%s", "weight": 3, "startDatetime": "%s", "endDatetime": "%s", "assignedToMembershipId": "%s", "taskType": "TASK", "priority": "HIGH"}
                        """.formatted(title, now, later, membership.getId()))
                .retrieve()
                .body(String.class);
        return JsonPath.read(response, "$.id");
    }

    @Test
    void activityList_includesChecklistAggregate() {
        String activityId = createActivity("Atividade com checklist");

        restClient.post()
                .uri("/api/v1/activities/{activityId}/checklist", activityId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title": "Item 1"}
                        """)
                .retrieve()
                .toBodilessEntity();
        String secondItem = restClient.post()
                .uri("/api/v1/activities/{activityId}/checklist", activityId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title": "Item 2"}
                        """)
                .retrieve()
                .body(String.class);
        String itemId = JsonPath.read(secondItem, "$.id");

        restClient.patch()
                .uri("/api/v1/activities/{activityId}/checklist/{itemId}", activityId, itemId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .toBodilessEntity();

        var listResponse = restClient.get()
                .uri("/api/v1/projects/{projectId}/activities", projectId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);

        assertThat(listResponse).contains("\"checklistTotal\":2");
        assertThat(listResponse).contains("\"checklistCompleted\":1");
    }

    @Test
    void activityWithoutChecklist_hasZeroCounts() {
        createActivity("Atividade sem checklist");

        var listResponse = restClient.get()
                .uri("/api/v1/projects/{projectId}/activities", projectId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);

        assertThat(listResponse).contains("\"checklistTotal\":0");
        assertThat(listResponse).contains("\"checklistCompleted\":0");
    }

    @Test
    void moveActivity_persistsStatusAndPosition() {
        String activityId = createActivity("Atividade para mover");

        var moveResponse = restClient.patch()
                .uri("/api/v1/activities/{activityId}/move", activityId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"status": "IN_PROGRESS", "position": 250}
                        """)
                .retrieve()
                .body(String.class);

        assertThat(JsonPath.<String>read(moveResponse, "$.status")).isEqualTo("IN_PROGRESS");
        assertThat(JsonPath.<Integer>read(moveResponse, "$.position")).isEqualTo(250);

        var getResponse = restClient.get()
                .uri("/api/v1/activities/{activityId}", activityId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .toEntity(String.class);
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(JsonPath.<String>read(getResponse.getBody(), "$.status")).isEqualTo("IN_PROGRESS");
    }
}
