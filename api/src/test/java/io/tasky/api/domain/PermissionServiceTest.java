package io.tasky.api.domain;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionServiceTest extends BaseIntegrationTest {

    @Autowired
    private PermissionService permissionService;

    private SecurityUser user(UUID id, UUID orgId, Role role) {
        return securityUser(id, orgId, role);
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
}
