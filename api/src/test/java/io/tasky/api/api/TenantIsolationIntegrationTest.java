package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
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

class TenantIsolationIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
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
        if (orgA != null) organizationRepository.delete(orgA);
        if (orgB != null) organizationRepository.delete(orgB);
        if (adminA != null) userRepository.delete(adminA);
        if (adminB != null) userRepository.delete(adminB);
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
    void orgB_cannotListClients_ofOrgA() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/clients", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotListLabels_ofOrgA() {
        var response = restClient.get()
                .uri("/api/v1/organizations/{orgId}/labels", orgA.getId())
                .header("Authorization", "Bearer " + tokenB)
                .retrieve()
                .onStatus(s -> s.value() == 403 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isIn(403, 404);
    }

    @Test
    void orgB_cannotListTeams_ofDeptA() {
        var response = restClient.get()
                .uri("/api/v1/departments/{deptId}/teams", deptAId)
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
