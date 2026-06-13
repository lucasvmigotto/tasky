package io.tasky.api.domain;

import io.tasky.api.domain.membership.Role;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PermissionServiceTest {

    @Test
    void adminCanInviteEveryone() {
        assertTrue(canInvite(Role.admin, Role.admin));
        assertTrue(canInvite(Role.admin, Role.manager));
        assertTrue(canInvite(Role.admin, Role.leader));
        assertTrue(canInvite(Role.admin, Role.employee));
    }

    @Test
    void managerCannotInviteAdmin() {
        assertFalse(canInvite(Role.manager, Role.admin));
    }

    @Test
    void managerCanInviteManagerLeaderEmployee() {
        assertTrue(canInvite(Role.manager, Role.manager));
        assertTrue(canInvite(Role.manager, Role.leader));
        assertTrue(canInvite(Role.manager, Role.employee));
    }

    @Test
    void leaderCannotInviteAdminOrManager() {
        assertFalse(canInvite(Role.leader, Role.admin));
        assertFalse(canInvite(Role.leader, Role.manager));
    }

    @Test
    void leaderCanInviteLeaderAndEmployee() {
        assertTrue(canInvite(Role.leader, Role.leader));
        assertTrue(canInvite(Role.leader, Role.employee));
    }

    @Test
    void employeeCannotInviteAnyone() {
        assertFalse(canInvite(Role.employee, Role.admin));
        assertFalse(canInvite(Role.employee, Role.manager));
        assertFalse(canInvite(Role.employee, Role.leader));
        assertFalse(canInvite(Role.employee, Role.employee));
    }

    @Test
    void adminCanCreateActivityForEveryoneExceptAdmin() {
        assertTrue(canCreateActivity(Role.admin, Role.manager));
        assertTrue(canCreateActivity(Role.admin, Role.leader));
        assertTrue(canCreateActivity(Role.admin, Role.employee));
        assertFalse(canCreateActivity(Role.admin, Role.admin));
    }

    @Test
    void managerCanCreateActivityForLeaderAndEmployee() {
        assertTrue(canCreateActivity(Role.manager, Role.leader));
        assertTrue(canCreateActivity(Role.manager, Role.employee));
        assertFalse(canCreateActivity(Role.manager, Role.admin));
        assertFalse(canCreateActivity(Role.manager, Role.manager));
    }

    @Test
    void leaderCanCreateActivityForEmployeeOnly() {
        assertTrue(canCreateActivity(Role.leader, Role.employee));
        assertFalse(canCreateActivity(Role.leader, Role.admin));
        assertFalse(canCreateActivity(Role.leader, Role.manager));
        assertFalse(canCreateActivity(Role.leader, Role.leader));
    }

    private boolean canInvite(Role inviter, Role target) {
        return switch (inviter) {
            case admin -> true;
            case manager -> target != Role.admin;
            case leader -> target == Role.employee || target == Role.leader;
            case employee -> false;
        };
    }

    private boolean canCreateActivity(Role creator, Role target) {
        return switch (creator) {
            case admin -> target != Role.admin;
            case manager -> target == Role.leader || target == Role.employee;
            case leader -> target == Role.employee;
            case employee -> false;
        };
    }
}
