package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.session.RefreshSessionService;
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

class TenantIsolationIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private RefreshSessionService refreshSessionService;
    @Autowired private io.tasky.api.domain.activity.ActivityRepository activityRepository;
    @Autowired private io.tasky.api.domain.project.ProjectRepository projectRepository;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;

    private String uid;
    private User adminA;
    private User adminB;
    private Organization orgA;
    private Organization orgB;
    private String tokenA;
    private String tokenB;
    private String deptAId;

    @BeforeEach
    void setUp() {
        uid = UUID.randomUUID().toString().substring(0, 8);
        adminA = userService.createUser("admin-a-" + uid + "@test.com", "sub-a-" + uid, "Admin A", null);
        adminB = userService.createUser("admin-b-" + uid + "@test.com", "sub-b-" + uid, "Admin B", null);
        orgA = organizationService.createOrganization("Org A " + uid, "org-a-" + uid, adminA);
        orgB = organizationService.createOrganization("Org B " + uid, "org-b-" + uid, adminB);
        tokenA = tokenFor(adminA.getId(), adminA.getEmail(), orgA.getId(), Role.admin);
        tokenB = tokenFor(adminB.getId(), adminB.getEmail(), orgB.getId(), Role.admin);

        String deptJson = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", orgA.getId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Dept A"}
                        """)
                .retrieve()
                .body(String.class);
        deptAId = JsonPath.read(deptJson, "$.id");
    }

    @AfterEach
    void cleanUp() {
        if (orgA != null) {
            for (UUID projectId : projectIdsCreated(orgA)) {
                activityRepository.deleteAll(activityRepository
                        .findByProjectIdAndProject_Department_Organization_Id(projectId, orgA.getId()));
            }
            projectRepository.deleteAll(projectRepository
                    .findByDepartment_Organization_Id(orgA.getId()));
            organizationRepository.delete(orgA);
        }
        if (orgB != null) organizationRepository.delete(orgB);
        if (adminA != null) userRepository.delete(adminA);
        if (adminB != null) userRepository.delete(adminB);
    }

    private List<UUID> projectIdsCreated(Organization org) {
        return projectRepository.findByDepartment_Organization_Id(org.getId()).stream()
                .map(io.tasky.api.domain.project.Project::getId)
                .toList();
    }

    @Test
    void orgB_cannotListDepartments_ofOrgA() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/departments", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotListMemberships_ofOrgA() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/memberships", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotListProjects_ofOrgA() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/projects", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotManageDeptOfOrgA() {
        var response = restClient.put()
                .uri("/api/v1/organizations/{orgId}/departments/{deptId}", orgA.getId(), deptAId)
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Hacked"}
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotCreateDepartment_inOrgA() {
        var response = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Hacked Dept"}
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotDeleteDepartment_ofOrgA() {
        var response = restClient.delete()
                .uri("/api/v1/organizations/{orgId}/departments/{deptId}", orgA.getId(), deptAId)
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotGetProject_ofOrgA() {
        String projectJson = restClient.post()
                .uri("/api/v1/departments/{deptId}/projects", deptAId)
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Secret Project"}
                        """)
                .retrieve()
                .body(String.class);
        String projectId = JsonPath.read(projectJson, "$.id");

        var response = restClient.get()
                .uri("/api/v1/projects/{projectId}", projectId)
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.is4xxClientError(), (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(400, 403, 404);
    }

    @Test
    void orgB_cannotGetActivity_ofOrgA() {
        String projectJson = restClient.post()
                .uri("/api/v1/departments/{deptId}/projects", deptAId)
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Activity Project"}
                        """)
                .retrieve()
                .body(String.class);
        String projectId = JsonPath.read(projectJson, "$.id");

        String membershipJson = restClient.get()
                .uri("/api/v1/organizations/{orgId}/memberships", orgA.getId())
                .header("Authorization", "Bearer " + tokenA)
                .retrieve()
                .body(String.class);
        String membershipId = JsonPath.read(membershipJson, "$[0].id");

        String activityJson = restClient.post()
                .uri("/api/v1/projects/{projectId}/activities", projectId)
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title": "Secret Task", "weight": 3,
                         "assignedToMembershipId": "%s",
                         "startDatetime": "2026-07-01T08:00:00Z",
                         "endDatetime": "2026-07-01T09:00:00Z"}
                        """.formatted(membershipId))
                .retrieve()
                .body(String.class);
        String activityId = JsonPath.read(activityJson, "$.id");

        var response = restClient.get()
                .uri("/api/v1/activities/{activityId}", activityId)
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.is4xxClientError(), (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(400, 403, 404);
    }

    @Test
    void orgB_reportSummary_seesNoOrgARows() {
        var response = restClient.get()
                .uri("/api/v1/reports/summary?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z")
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .toEntity(String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).doesNotContain("Org A");
    }

    @Test
    void switchToForeignOrg_denied() {
        var session = refreshSessionService.create(adminB, orgB, "127.0.0.1");
        var response = restClient.post()
                .uri("/api/v1/auth/switch-org")
                .header("Authorization", "Bearer " + tokenB)
                .header("Cookie", "tasky_refresh=" + session.rawToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"orgId": "%s"}
                        """.formatted(orgA.getId()))
                .retrieve()
                .onStatus(s -> s.is4xxClientError(), (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(400, 403, 404);
    }

    @Test
    void orgA_canListOwnDepartments() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/departments", orgA.getId())
                .header("Authorization", "Bearer " + tokenA)
                .retrieve()
                .toEntity(String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("Dept A");
    }

    @Test
    void noToken_returns401() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/departments", orgA.getId())
                .retrieve()
                .onStatus(s -> s.value() == 401, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }
}
