package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.membership.InvitationStatus;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.PermissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MembershipScopeIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private MembershipService membershipService;
    @Autowired private PermissionService permissionService;

    private final List<User> users = new ArrayList<>();
    private Organization organization;
    private Organization otherOrganization;
    private User admin;
    private String adminToken;
    private UUID departmentA;
    private UUID departmentB;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = createUser("scope-admin-" + suffix + "@test.com", "scope-admin-" + suffix);
        User otherAdmin = createUser("scope-other-" + suffix + "@test.com", "scope-other-" + suffix);
        organization = organizationService.createOrganization("Scope Org " + suffix, "scope-org-" + suffix, admin);
        otherOrganization = organizationService.createOrganization("Other Scope Org " + suffix, "other-scope-org-" + suffix, otherAdmin);
        adminToken = tokenFor(admin.getId(), admin.getEmail(), organization.getId(), Role.admin);
        departmentA = createDepartment(organization, adminToken, "Sistemas");
        departmentB = createDepartment(organization, adminToken, "Comunicação");
    }

    @AfterEach
    void cleanUp() {
        if (organization != null) organizationRepository.delete(organization);
        if (otherOrganization != null) organizationRepository.delete(otherOrganization);
        users.forEach(userRepository::delete);
    }

    @Test
    void managerCanInviteEmployeeOnlyInsideManagedDepartment() {
        User manager = createUserWithSuffix("manager");
        OrganizationMembership managerMembership = invite(
                adminToken, manager.getEmail(), Role.manager, List.of(departmentA));
        String managerToken = tokenFor(manager.getId(), manager.getEmail(), organization.getId(), Role.manager);
        User employeeA = createUserWithSuffix("employee-a");

        var allowed = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(employeeA.getEmail(), Role.employee, List.of(departmentA)))
                .retrieve()
                .toEntity(String.class);

        assertThat(allowed.getStatusCode().value()).isEqualTo(201);
        assertThat(JsonPath.<String>read(allowed.getBody(), "$.primaryDepartmentId"))
                .isEqualTo(departmentA.toString());
        UUID employeeAMembershipId = UUID.fromString(JsonPath.read(allowed.getBody(), "$.id"));
        membershipService.acceptPendingInvitations(employeeA, employeeA.getEmail());
        assertThat(permissionService.isManagerOfDepartment(manager.getId(), departmentA)).isTrue();
        assertThat(managerMembership.getPrimaryDepartmentId()).isEqualTo(departmentA);

        User employeeB = createUserWithSuffix("employee-b");
        var denied = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(employeeB.getEmail(), Role.employee, List.of(departmentB)))
                .retrieve()
                .onStatus(status -> status.value() == 403, (request, response) -> {})
                .toBodilessEntity();

        assertThat(denied.getStatusCode().value()).isEqualTo(403);
        assertThat(membershipRepository.existsByUserIdAndOrganizationId(employeeB.getId(), organization.getId())).isFalse();

        OrganizationMembership employeeBMembership = invite(
                adminToken, employeeB.getEmail(), Role.employee, List.of(departmentB));
        var crossDepartmentRemoval = restClient.delete()
                .uri("/api/v1/organizations/{orgId}/memberships/{membershipId}",
                        organization.getId(), employeeBMembership.getId())
                .header("Authorization", "Bearer " + managerToken)
                .retrieve()
                .onStatus(status -> status.value() == 403, (request, response) -> {})
                .toBodilessEntity();
        assertThat(crossDepartmentRemoval.getStatusCode().value()).isEqualTo(403);

        var ownDepartmentRemoval = restClient.delete()
                .uri("/api/v1/organizations/{orgId}/memberships/{membershipId}",
                        organization.getId(), employeeAMembershipId)
                .header("Authorization", "Bearer " + managerToken)
                .retrieve()
                .toBodilessEntity();
        assertThat(ownDepartmentRemoval.getStatusCode().value()).isEqualTo(204);
        assertThat(membershipRepository.findById(employeeAMembershipId).orElseThrow().isActive()).isFalse();
    }

    @Test
    void crossTenantDepartmentIsRejectedWithoutCreatingMembership() {
        User target = createUserWithSuffix("cross-tenant");
        User otherAdmin = users.stream()
                .filter(user -> user.getEmail().startsWith("scope-other-"))
                .findFirst()
                .orElseThrow();
        String otherToken = tokenFor(otherAdmin.getId(), otherAdmin.getEmail(), otherOrganization.getId(), Role.admin);
        UUID foreignDepartment = createDepartment(otherOrganization, otherToken, "Setor externo");

        var response = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(target.getEmail(), Role.employee, List.of(foreignDepartment)))
                .retrieve()
                .onStatus(status -> status.value() == 400, (request, result) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(membershipRepository.existsByUserIdAndOrganizationId(target.getId(), organization.getId())).isFalse();
    }

    @Test
    void changingRoleRemovesStaleManagementScope() {
        User manager = createUserWithSuffix("demoted-manager");
        OrganizationMembership membership = invite(
                adminToken, manager.getEmail(), Role.manager, List.of(departmentA));

        var response = restClient.patch()
                .uri("/api/v1/organizations/{orgId}/memberships/{membershipId}/role",
                        organization.getId(), membership.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"role":"employee","departmentId":"%s"}
                        """.formatted(departmentB))
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(permissionService.isManagerOfDepartment(manager.getId(), departmentA)).isFalse();
        assertThat(JsonPath.<String>read(response.getBody(), "$.primaryDepartmentId"))
                .isEqualTo(departmentB.toString());
    }

    @Test
    void sectorOverviewDerivesManagerScopeWithoutExposingAnotherDepartment() {
        User manager = createUserWithSuffix("overview-manager");
        invite(adminToken, manager.getEmail(), Role.manager, List.of(departmentA));
        User employeeA = createUserWithSuffix("overview-employee-a");
        User employeeB = createUserWithSuffix("overview-employee-b");
        OrganizationMembership inScope = invite(
                adminToken, employeeA.getEmail(), Role.employee, List.of(departmentA));
        OrganizationMembership outsideScope = invite(
                adminToken, employeeB.getEmail(), Role.employee, List.of(departmentB));
        String managerToken = tokenFor(manager.getId(), manager.getEmail(), organization.getId(), Role.manager);

        String response = restClient.get()
                .uri("/api/v1/me/sector")
                .header("Authorization", "Bearer " + managerToken)
                .retrieve()
                .body(String.class);

        assertThat(JsonPath.<String>read(response, "$.role")).isEqualTo("manager");
        assertThat(JsonPath.<List<String>>read(response, "$.departments[*].id"))
                .containsExactly(departmentA.toString());
        assertThat(JsonPath.<List<String>>read(response, "$.members[*].id"))
                .contains(inScope.getId().toString())
                .doesNotContain(outsideScope.getId().toString());
        assertThat(response).doesNotContain(employeeA.getEmail()).doesNotContain(employeeB.getEmail());
    }

    @Test
    void sectorOverviewKeepsEmployeeSelfScoped() {
        User employee = createUserWithSuffix("overview-self-employee");
        OrganizationMembership membership = invite(
                adminToken, employee.getEmail(), Role.employee, List.of(departmentA));
        String employeeToken = tokenFor(employee.getId(), employee.getEmail(), organization.getId(), Role.employee);

        String response = restClient.get()
                .uri("/api/v1/me/sector")
                .header("Authorization", "Bearer " + employeeToken)
                .retrieve()
                .body(String.class);

        assertThat(JsonPath.<List<String>>read(response, "$.departments[*].id"))
                .containsExactly(departmentA.toString());
        assertThat(JsonPath.<List<String>>read(response, "$.members[*].id"))
                .containsExactly(membership.getId().toString());
        assertThat(response).doesNotContain(employee.getEmail());
    }

    @Test
    void unknownEmailIsPreRegisteredAndLinkedOnFirstInstitutionalLogin() {
        String email = "first-login-" + UUID.randomUUID().toString().substring(0, 8) + "@orgao.gov.br";

        OrganizationMembership membership = invite(
                adminToken, email, Role.employee, List.of(departmentA));
        User invited = userRepository.findByEmail(email).orElseThrow();
        users.add(invited);

        assertThat(invited.getGoogleSub()).isNull();
        assertThat(membership.getUser().getId()).isEqualTo(invited.getId());

        User loggedIn = userService.getOrCreateUser(email, "verified-google-sub", "Servidor", null);

        assertThat(loggedIn.getId()).isEqualTo(invited.getId());
        assertThat(loggedIn.getGoogleSub()).isEqualTo("verified-google-sub");
        assertThat(membershipRepository.existsByUserIdAndOrganizationId(loggedIn.getId(), organization.getId())).isTrue();
    }

    @Test
    void invitationStaysPendingUntilMatchingLoginAndCanBeRevoked() {
        User invitedUser = createUserWithSuffix("pending-invitation");
        String invitation = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(invitedUser.getEmail(), Role.employee, List.of(departmentA)))
                .retrieve()
                .body(String.class);
        UUID membershipId = UUID.fromString(JsonPath.read(invitation, "$.id"));

        OrganizationMembership pending = membershipRepository.findById(membershipId).orElseThrow();
        assertThat(pending.getInvitationStatus()).isEqualTo(InvitationStatus.PENDING);
        assertThat(pending.isActive()).isFalse();
        assertThat(membershipService.getVisibleMemberships(organization.getId(), admin.getId()))
                .noneMatch(m -> m.getId().equals(membershipId));

        var duplicate = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(invitedUser.getEmail(), Role.employee, List.of(departmentA)))
                .retrieve()
                .onStatus(status -> status.value() == 409, (request, response) -> {})
                .toBodilessEntity();
        assertThat(duplicate.getStatusCode().value()).isEqualTo(409);

        String invitations = restClient.get()
                .uri("/api/v1/organizations/{orgId}/memberships/invitations", organization.getId())
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<List<String>>read(invitations, "$[?(@.status == 'PENDING')].id"))
                .contains(membershipId.toString());

        restClient.patch()
                .uri("/api/v1/organizations/{orgId}/memberships/{membershipId}/revoke-invitation",
                        organization.getId(), membershipId)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .toBodilessEntity();
        assertThat(membershipRepository.findById(membershipId).orElseThrow().getInvitationStatus())
                .isEqualTo(InvitationStatus.REVOKED);
    }

    @Test
    void matchingVerifiedEmailAcceptsPendingInvitation() {
        User invitedUser = createUserWithSuffix("accepted-invitation");
        String invitation = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(invitedUser.getEmail(), Role.employee, List.of(departmentA)))
                .retrieve()
                .body(String.class);
        UUID membershipId = UUID.fromString(JsonPath.read(invitation, "$.id"));

        membershipService.acceptPendingInvitations(invitedUser, invitedUser.getEmail());

        OrganizationMembership accepted = membershipRepository.findById(membershipId).orElseThrow();
        assertThat(accepted.getInvitationStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(accepted.isActive()).isTrue();
        assertThat(accepted.getAcceptedAt()).isNotNull();
    }

    private User createUserWithSuffix(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return createUser(prefix + "-" + suffix + "@test.com", prefix + "-" + suffix);
    }

    private User createUser(String email, String googleSub) {
        User user = userService.createUser(email, googleSub, email, null);
        users.add(user);
        return user;
    }

    private UUID createDepartment(Organization org, String token, String name) {
        String json = restClient.post()
                .uri("/api/v1/organizations/{orgId}/departments", org.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"name\":\"" + name + "\"}")
                .retrieve()
                .body(String.class);
        return UUID.fromString(JsonPath.read(json, "$.id"));
    }

    private OrganizationMembership invite(String token, String email, Role role, List<UUID> departments) {
        String json = restClient.post()
                .uri("/api/v1/organizations/{orgId}/memberships/invite", organization.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(inviteBody(email, role, departments))
                .retrieve()
                .body(String.class);
        UUID membershipId = UUID.fromString(JsonPath.read(json, "$.id"));
        OrganizationMembership membership = membershipRepository.findById(membershipId).orElseThrow();
        membershipService.acceptPendingInvitations(membership.getUser(), membership.getUser().getEmail());
        return membershipRepository.findById(membershipId).orElseThrow();
    }

    private String inviteBody(String email, Role role, List<UUID> departments) {
        String departmentJson = departments.stream().map(id -> "\"" + id + "\"").collect(java.util.stream.Collectors.joining(","));
        return """
                {"email":"%s","role":"%s","departmentIds":[%s]}
                """.formatted(email, role, departmentJson);
    }
}
