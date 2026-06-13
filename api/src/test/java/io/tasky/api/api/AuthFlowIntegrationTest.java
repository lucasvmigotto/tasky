package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AuthFlowIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private OrganizationService organizationService;
    @Autowired
    private UserService userService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OrganizationRepository organizationRepository;

    private String uniqueId;
    private User testUser;
    private Organization testOrg;
    private String adminToken;

    @BeforeEach
    void setUp() {
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
        testUser = userService.createUser("admin-" + uniqueId + "@test.com", "google-sub-" + uniqueId, "Admin", null);
        testOrg = organizationService.createOrganization("Test Org " + uniqueId, "test-org-" + uniqueId, testUser);
        adminToken = tokenFor(testUser.getId(), testUser.getEmail(), testOrg.getId(), Role.admin);
    }

    @AfterEach
    void cleanUp() {
        if (testOrg != null) organizationRepository.delete(testOrg);
        if (testUser != null) userRepository.delete(testUser);
    }

    @Test
    void createDepartment_asAdmin_returns201() {
        var response = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", testOrg.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Engineering"}
                        """)
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).contains("Engineering");
    }

    @Test
    void createDepartment_withoutAuth_returns401() {
        var response = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", testOrg.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Engineering"}
                        """)
                .retrieve()
                .onStatus(status -> status.value() == 401, (req, res) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void createTeam_asAdmin_returns201() {
        String deptJson = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", testOrg.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Engineering"}
                        """)
                .retrieve()
                .body(String.class);

        String deptId = JsonPath.read(deptJson, "$.id");

        var response = restClient.post()
                .uri("/api/v1/departments/{deptId}/teams", deptId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"name": "Backend"}
                        """)
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).contains("Backend");
    }
}
