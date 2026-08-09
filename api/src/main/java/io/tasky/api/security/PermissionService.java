package io.tasky.api.security;

import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.ManagerDepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.project.ProjectAssignmentRepository;
import io.tasky.api.domain.project.CrossDepartmentProjectAccessRepository;
import io.tasky.api.domain.timesheet.TimesheetPeriod;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component("access")
@RequiredArgsConstructor
public class PermissionService {

    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;
    private final CrossDepartmentProjectAccessRepository crossDepartmentProjectAccessRepository;
    private final ActivityRepository activityRepository;

    private static final Map<Role, Set<Role>> ROLE_HIERARCHY = new EnumMap<>(Role.class);

    static {
        ROLE_HIERARCHY.put(Role.admin, Set.of(Role.admin, Role.manager, Role.employee));
        ROLE_HIERARCHY.put(Role.manager, Set.of(Role.manager, Role.employee));
        ROLE_HIERARCHY.put(Role.employee, Set.of(Role.employee));
    }

    public boolean canInviteRole(Role inviterRole, Role targetRole) {
        if (inviterRole == Role.admin) return true;
        if (inviterRole == Role.manager) return targetRole == Role.employee;
        return false;
    }

    public boolean canCreateActivityFor(Role creatorRole, Role targetRole) {
        if (creatorRole == Role.admin) return targetRole != Role.admin;
        if (creatorRole == Role.manager) return targetRole == Role.employee;
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

    public boolean canManageOrganization(SecurityUser user, UUID orgId) {
        return isAdmin(user.id(), orgId);
    }

    public boolean canManageDepartment(SecurityUser user, UUID deptId) {
        return isManagerOfDepartment(user.id(), deptId);
    }

    public boolean canManageMembership(SecurityUser user, UUID membershipId) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            return false;
        }
        Optional<OrganizationMembership> actorResult = getMembership(user.id(), orgId);
        Optional<OrganizationMembership> targetResult = membershipRepository.findById(membershipId)
                .filter(target -> target.isActive() && target.getOrganization().getId().equals(orgId));
        if (actorResult.isEmpty() || targetResult.isEmpty()) {
            return false;
        }
        OrganizationMembership actor = actorResult.get();
        OrganizationMembership target = targetResult.get();
        if (actor.getRole() == Role.admin) {
            return true;
        }
        if (actor.getRole() == Role.manager
                && target.getRole() != Role.admin
                && target.getRole() != Role.manager
                && target.getPrimaryDepartmentId() != null) {
            return managerDepartmentRepository.existsByMembershipIdAndDepartmentId(
                    actor.getId(), target.getPrimaryDepartmentId());
        }
        return false;
    }

    public boolean canCreateProject(SecurityUser user, UUID deptId) {
        return isManagerOfDepartment(user.id(), deptId) || isAdmin(user.id(), getOrgIdFromDept(deptId));
    }

    public boolean canManageProject(SecurityUser user, UUID projectId) {
        return projectRepository.findById(projectId)
                .map(p -> isManagerOfDepartment(user.id(), p.getDepartment().getId())
                        || isAdmin(user.id(), p.getDepartment().getOrganization().getId()))
                .orElse(false);
    }

    public boolean canReadProject(SecurityUser user, UUID projectId) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            return false;
        }
        return projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .map(project -> getMembership(user.id(), orgId)
                        .map(membership -> {
                            if (membership.getRole() == Role.admin
                                    || (project.getManagerMembership() != null
                                        && project.getManagerMembership().getId().equals(membership.getId()))
                                    || projectAssignmentRepository.existsByProjectIdAndMembershipId(projectId, membership.getId())
                                    || managerDepartmentRepository.existsByMembershipIdAndDepartmentId(
                                            membership.getId(), project.getDepartment().getId())) {
                                return true;
                            }
                            return accessibleDepartmentIds(membership).stream()
                                    .anyMatch(departmentId -> crossDepartmentProjectAccessRepository
                                            .existsByProjectIdAndDepartmentId(projectId, departmentId));
                        })
                        .orElse(false))
                .orElse(false);
    }

    public boolean canManageActivity(SecurityUser user, UUID activityId) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            return false;
        }
        return activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .map(a -> canManageProject(user, a.getProject().getId())
                        || a.getCreatedBy().getId().equals(membershipIdOf(user, orgId)))
                .orElse(false);
    }

    public boolean canReadActivity(SecurityUser user, UUID activityId) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            return false;
        }
        return activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .map(activity -> canReadProject(user, activity.getProject().getId())
                        || getMembership(user.id(), orgId)
                                .map(membership -> activity.getAssignedTo() != null
                                        && activity.getAssignedTo().getId().equals(membership.getId())
                                        || activity.getCreatedBy().getId().equals(membership.getId()))
                                .orElse(false))
                .orElse(false);
    }

    public boolean canViewOrganizationReports(SecurityUser user, UUID orgId) {
        return isAdmin(user.id(), orgId);
    }

    public boolean canViewFinancialReports(SecurityUser user, UUID orgId) {
        if (orgId == null) {
            return false;
        }
        return getMembership(user.id(), orgId)
                .map(m -> {
                    if (m.getRole() == Role.admin) {
                        return true;
                    }
                    if (m.getRole() == Role.manager) {
                        return !managerDepartmentRepository.findByMembershipId(m.getId()).isEmpty();
                    }
                    return true;
                })
                .orElse(false);
    }

    public boolean isManagerOrAdminOfOrganization(SecurityUser user, UUID orgId) {
        return isAdmin(user.id(), orgId);
    }

    public boolean canManageCapacity(SecurityUser user, UUID orgId) {
        return getMembership(user.id(), orgId)
                .map(m -> m.getRole() == Role.admin || m.getRole() == Role.manager)
                .orElse(false);
    }

    public boolean canManageCapacity(OrganizationMembership membership) {
        return membership.getRole() == Role.admin || membership.getRole() == Role.manager;
    }

    public boolean canManageMembershipCapacity(SecurityUser user, UUID orgId, UUID targetMembershipId) {
        if (canManageCapacity(user, orgId)) {
            return true;
        }
        return scopedMembershipIds(user, orgId).contains(targetMembershipId);
    }

    public Set<UUID> readableProjectIds(SecurityUser user, UUID orgId) {
        if (orgId == null) {
            return Set.of();
        }
        OrganizationMembership membership = getMembership(user.id(), orgId).orElse(null);
        if (membership == null) {
            return Set.of();
        }
        if (membership.getRole() == Role.admin) {
            return projectRepository.findByDepartment_Organization_Id(orgId).stream()
                    .map(Project::getId)
                    .collect(Collectors.toSet());
        }
        Set<UUID> ids = new HashSet<>();
        projectRepository.findByManagerMembershipId(membership.getId()).forEach(p -> ids.add(p.getId()));
        projectAssignmentRepository.findProjectIdsByMembershipId(membership.getId()).forEach(ids::add);
        Set<UUID> managedDepartmentIds = new HashSet<>(
                managerDepartmentRepository.findDepartmentIdsByMembershipId(membership.getId()));
        if (!managedDepartmentIds.isEmpty()) {
            projectRepository.findByDepartmentIdIn(managedDepartmentIds).forEach(p -> ids.add(p.getId()));
        }
        if (!managedDepartmentIds.isEmpty()) {
            crossDepartmentProjectAccessRepository.findProjectIdsByDepartmentIdIn(managedDepartmentIds)
                    .forEach(ids::add);
        }
        return ids;
    }

    public Set<UUID> scopedMembershipIdsForDepartment(SecurityUser user, UUID orgId, UUID departmentId) {
        if (departmentId == null) {
            return scopedMembershipIds(user, orgId);
        }
        OrganizationMembership actor = getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        if (actor.getRole() != Role.admin) {
            return scopedMembershipIds(user, orgId);
        }
        if (!departmentRepository.findByIdAndOrganizationId(departmentId, orgId).isPresent()) {
            throw new IllegalArgumentException("Department not found in this organization");
        }
        return membershipRepository.findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdIn(orgId, Set.of(departmentId))
                .stream()
                .map(OrganizationMembership::getId)
                .collect(Collectors.toSet());
    }

    public Set<UUID> scopedMembershipIds(SecurityUser user, UUID orgId) {
        if (orgId == null) {
            return Set.of();
        }
        OrganizationMembership actor = getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        Set<UUID> scoped = new HashSet<>();
        scoped.add(actor.getId());
        if (actor.getRole() == Role.admin) {
            membershipRepository.findByOrganizationIdAndIsActiveTrue(orgId)
                    .forEach(m -> scoped.add(m.getId()));
            return scoped;
        }
        if (actor.getRole() == Role.manager) {
            Set<UUID> departmentIds = managerDepartmentRepository.findByMembershipId(actor.getId()).stream()
                    .map(managerDepartment -> managerDepartment.getDepartment().getId())
                    .collect(Collectors.toSet());
            if (!departmentIds.isEmpty()) {
                membershipRepository.findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdIn(orgId, departmentIds)
                        .forEach(m -> scoped.add(m.getId()));
            }
            return scoped;
        }
        return scoped;
    }

    public boolean canSubmitTimesheet(SecurityUser user, UUID membershipId) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            return false;
        }
        Optional<OrganizationMembership> actor = getMembership(user.id(), orgId);
        if (actor.isEmpty()) {
            return false;
        }
        if (actor.get().getId().equals(membershipId)) {
            return true;
        }
        Optional<OrganizationMembership> target = membershipRepository.findById(membershipId)
                .filter(m -> m.isActive() && m.getOrganization().getId().equals(orgId));
        return target.map(t -> isScopedApprover(actor.get(), t)).orElse(false);
    }

    public boolean canApproveTimesheetPeriod(SecurityUser user, TimesheetPeriod period) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null || period == null || !period.getOrganization().getId().equals(orgId)) {
            return false;
        }
        return getMembership(user.id(), orgId)
                .map(actor -> isScopedApprover(actor, period.getMembership()))
                .orElse(false);
    }

    public boolean canCloseTimesheetPeriod(SecurityUser user, TimesheetPeriod period) {
        return canApproveTimesheetPeriod(user, period);
    }

    private boolean isScopedApprover(OrganizationMembership actor, OrganizationMembership target) {
        if (actor.getRole() == Role.admin) {
            return true;
        }
        return actor.getRole() == Role.manager
                && target.getPrimaryDepartmentId() != null
                && managerDepartmentRepository.existsByMembershipIdAndDepartmentId(
                        actor.getId(), target.getPrimaryDepartmentId());
    }

    private Set<UUID> accessibleDepartmentIds(OrganizationMembership membership) {
        Set<UUID> departmentIds = new java.util.HashSet<>();
        managerDepartmentRepository.findByMembershipId(membership.getId()).stream()
                .map(managerDepartment -> managerDepartment.getDepartment().getId())
                .forEach(departmentIds::add);
        return departmentIds;
    }

    private UUID membershipIdOf(SecurityUser user, UUID orgId) {
        return getMembership(user.id(), orgId).map(OrganizationMembership::getId).orElse(null);
    }

    public Optional<OrganizationMembership> getMembership(UUID userId, UUID orgId) {
        return membershipRepository.findByUserIdAndOrganizationIdAndIsActiveTrue(userId, orgId);
    }

    public Optional<OrganizationMembership> getMembershipByUserAndDepartment(UUID userId, UUID deptId) {
        return departmentRepository.findById(deptId)
                .flatMap(dept -> membershipRepository.findByUserIdAndOrganizationIdAndIsActiveTrue(userId, dept.getOrganization().getId()));
    }

    private UUID getOrgIdFromDept(UUID deptId) {
        return departmentRepository.findById(deptId)
                .map(d -> d.getOrganization().getId())
                .orElse(null);
    }
}
