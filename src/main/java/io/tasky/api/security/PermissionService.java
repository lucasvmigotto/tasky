package io.tasky.api.security;

import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.LeaderTeamRepository;
import io.tasky.api.domain.membership.ManagerDepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.team.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component("access")
@RequiredArgsConstructor
public class PermissionService {

    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final LeaderTeamRepository leaderTeamRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;

    private static final Map<Role, Set<Role>> ROLE_HIERARCHY = new EnumMap<>(Role.class);

    static {
        ROLE_HIERARCHY.put(Role.admin, Set.of(Role.admin, Role.manager, Role.leader, Role.employee));
        ROLE_HIERARCHY.put(Role.manager, Set.of(Role.manager, Role.leader, Role.employee));
        ROLE_HIERARCHY.put(Role.leader, Set.of(Role.leader, Role.employee));
        ROLE_HIERARCHY.put(Role.employee, Set.of(Role.employee));
    }

    public boolean canInviteRole(Role inviterRole, Role targetRole) {
        if (inviterRole == Role.admin) return true;
        if (inviterRole == Role.manager) return targetRole != Role.admin;
        if (inviterRole == Role.leader) return targetRole == Role.employee || targetRole == Role.leader;
        return false;
    }

    public boolean canCreateActivityFor(Role creatorRole, Role targetRole) {
        if (creatorRole == Role.admin) return targetRole != Role.admin;
        if (creatorRole == Role.manager) return targetRole == Role.leader || targetRole == Role.employee;
        if (creatorRole == Role.leader) return targetRole == Role.employee;
        return false;
    }

    public boolean isAdmin(UUID userId, UUID orgId) {
        return getMembership(userId, orgId)
                .map(m -> m.getRole() == Role.admin)
                .orElse(false);
    }

    public boolean isManagerOfDepartment(UUID userId, UUID deptId) {
        return getMembershipByUserAndDepartment(userId, deptId)
                .map(m -> {
                    if (m.getRole() == Role.admin) return true;
                    if (m.getRole() == Role.manager) {
                        return managerDepartmentRepository.existsByMembershipIdAndDepartmentId(m.getId(), deptId);
                    }
                    return false;
                })
                .orElse(false);
    }

    public boolean isLeaderOfTeam(UUID userId, UUID teamId) {
        return getMembershipByUserAndTeam(userId, teamId)
                .map(m -> {
                    if (m.getRole() == Role.admin) return true;
                    if (m.getRole() == Role.manager) {
                        UUID deptId = teamRepository.findById(teamId)
                                .map(t -> t.getDepartment().getId())
                                .orElse(null);
                        return deptId != null && managerDepartmentRepository.existsByMembershipIdAndDepartmentId(m.getId(), deptId);
                    }
                    if (m.getRole() == Role.leader) {
                        return leaderTeamRepository.existsByMembershipIdAndTeamId(m.getId(), teamId);
                    }
                    return false;
                })
                .orElse(false);
    }

    public boolean canManageOrganization(SecurityUser user, UUID orgId) {
        return isAdmin(user.id(), orgId);
    }

    public boolean canManageDepartment(SecurityUser user, UUID deptId) {
        return isManagerOfDepartment(user.id(), deptId);
    }

    public boolean canManageTeam(SecurityUser user, UUID teamId) {
        return isLeaderOfTeam(user.id(), teamId);
    }

    public boolean canCreateProject(SecurityUser user, UUID deptId) {
        return isManagerOfDepartment(user.id(), deptId) || isAdmin(user.id(), getOrgIdFromDept(deptId));
    }

    public Optional<OrganizationMembership> getMembership(UUID userId, UUID orgId) {
        return membershipRepository.findByUserIdAndOrganizationId(userId, orgId);
    }

    public Optional<OrganizationMembership> getMembershipByUserAndDepartment(UUID userId, UUID deptId) {
        return departmentRepository.findById(deptId)
                .flatMap(dept -> membershipRepository.findByUserIdAndOrganizationId(userId, dept.getOrganization().getId()));
    }

    public Optional<OrganizationMembership> getMembershipByUserAndTeam(UUID userId, UUID teamId) {
        return teamRepository.findById(teamId)
                .flatMap(team -> departmentRepository.findById(team.getDepartment().getId())
                        .flatMap(dept -> membershipRepository.findByUserIdAndOrganizationId(userId, dept.getOrganization().getId())));
    }

    private UUID getOrgIdFromDept(UUID deptId) {
        return departmentRepository.findById(deptId)
                .map(d -> d.getOrganization().getId())
                .orElse(null);
    }
}
