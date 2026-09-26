package io.tasky.api.domain;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionServiceTest extends BaseIntegrationTest {

    @Autowired
    private PermissionService permissionService;
    @Autowired
    private OrganizationService organizationService;
    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private OrganizationMembershipRepository membershipRepository;
    @Autowired
    private UserService userService;
    @Autowired
    private UserRepository userRepository;

    private Organization org;
    private User admin;
    private User employee;

    private SecurityUser user(UUID id, UUID orgId, Role role) {
        return securityUser(id, orgId, role);
    }

    @AfterEach
    void cleanUpScopeFixtures() {
        if (org != null) {
            membershipRepository.deleteAll(membershipRepository.findByOrganizationId(org.getId()));
            departmentRepository.deleteAll(departmentRepository.findByOrganizationId(org.getId()));
            organizationRepository.delete(org);
            org = null;
        }
        if (admin != null) {
            userRepository.delete(admin);
            admin = null;
        }
        if (employee != null) {
            userRepository.delete(employee);
            employee = null;
        }
    }

    @Test
    void adminCanInviteEveryone() {
        var user = user(UUID.randomUUID(), UUID.randomUUID(), Role.admin);
        assertThat(permissionService.canInviteRole(user.role(), Role.admin)).isTrue();
        assertThat(permissionService.canInviteRole(user.role(), Role.manager)).isTrue();
        assertThat(permissionService.canInviteRole(user.role(), Role.employee)).isTrue();
    }

    @Test
    void managerCanInviteOnlyEmployees() {
        assertThat(permissionService.canInviteRole(Role.manager, Role.admin)).isFalse();
        assertThat(permissionService.canInviteRole(Role.manager, Role.manager)).isFalse();
        assertThat(permissionService.canInviteRole(Role.manager, Role.employee)).isTrue();
    }

    @Test
    void employeeCannotInviteAnyone() {
        assertThat(permissionService.canInviteRole(Role.employee, Role.admin)).isFalse();
        assertThat(permissionService.canInviteRole(Role.employee, Role.manager)).isFalse();
        assertThat(permissionService.canInviteRole(Role.employee, Role.employee)).isFalse();
    }

    @Test
    void adminCanCreateActivityForEveryoneExceptAdmin() {
        assertThat(permissionService.canCreateActivityFor(Role.admin, Role.manager)).isTrue();
        assertThat(permissionService.canCreateActivityFor(Role.admin, Role.employee)).isTrue();
        assertThat(permissionService.canCreateActivityFor(Role.admin, Role.admin)).isFalse();
    }

    @Test
    void managerCanCreateActivityForEmployeeOnly() {
        assertThat(permissionService.canCreateActivityFor(Role.manager, Role.employee)).isTrue();
        assertThat(permissionService.canCreateActivityFor(Role.manager, Role.admin)).isFalse();
        assertThat(permissionService.canCreateActivityFor(Role.manager, Role.manager)).isFalse();
    }

    @Test
    void membershipOutsideOrganizationReturnsEmpty() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        assertThat(permissionService.getMembership(userId, orgId)).isEmpty();
    }

    @Test
    void adminDeptScope_includesSelfWithoutDepartment_andDeptMembers() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        admin = userService.createUser("scope-admin-" + uid + "@test.com", "sub-scope-admin-" + uid, "Admin", null);
        employee = userService.createUser("scope-emp-" + uid + "@test.com", "sub-scope-emp-" + uid, "Emp", null);
        org = organizationService.createOrganization("Scope Org " + uid, "scope-org-" + uid, admin);
        Department dept = departmentRepository.save(Department.builder()
                .organization(org)
                .name("Dept")
                .build());
        OrganizationMembership adminMembership = membershipRepository
                .findByOrganizationId(org.getId()).stream()
                .filter(m -> m.getUser().getId().equals(admin.getId()))
                .findFirst().orElseThrow();
        OrganizationMembership employeeMembership = membershipRepository.save(OrganizationMembership.builder()
                .user(employee)
                .organization(org)
                .role(Role.employee)
                .primaryDepartmentId(dept.getId())
                .maxDailyWorkMinutes(480)
                .build());

        var scope = permissionService.scopedMembershipIdsForDepartment(
                user(admin.getId(), org.getId(), Role.admin), org.getId(), dept.getId());

        assertThat(scope).contains(adminMembership.getId(), employeeMembership.getId());
    }
}
