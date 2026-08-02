package io.tasky.api.domain.sector;

import io.tasky.api.api.capacity.MemberCapacityResponse;
import io.tasky.api.api.capacity.SectorCapacityView;
import io.tasky.api.api.sector.SectorOverviewResponse;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.capacity.CapacityService;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.LeaderTeamRepository;
import io.tasky.api.domain.membership.ManagerDepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectAssignmentRepository;
import io.tasky.api.domain.project.CrossDepartmentProjectAccessRepository;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.team.Team;
import io.tasky.api.domain.team.TeamRepository;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SectorOverviewService {

    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final LeaderTeamRepository leaderTeamRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;
    private final CrossDepartmentProjectAccessRepository crossDepartmentProjectAccessRepository;
    private final ActivityRepository activityRepository;
    private final CapacityService capacityService;

    @Transactional(readOnly = true)
    public SectorCapacityView getOverviewWithCapacity(SecurityUser user, Instant from, Instant to) {
        SectorOverviewResponse overview = getOverview(user);
        List<MemberCapacityResponse> capacities = capacityService.getMemberCapacity(user, from, to);
        return new SectorCapacityView(overview, capacities);
    }

    @Transactional(readOnly = true)
    public SectorOverviewResponse getOverview(SecurityUser user) {
        UUID organizationId = user.activeOrganizationId();
        if (organizationId == null) {
            throw new SecurityException("Active organization is required");
        }
        OrganizationMembership current = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), organizationId)
                .orElseThrow(() -> new SecurityException("Active membership is required"));

        Scope scope = resolveScope(current, organizationId);
        List<Department> departments = scope.departmentIds().isEmpty()
                ? List.of()
                : departmentRepository.findByIdInAndOrganizationId(scope.departmentIds(), organizationId);
        Set<UUID> validDepartmentIds = departments.stream().map(Department::getId).collect(Collectors.toSet());
        List<Team> teams = resolveTeams(current.getRole(), scope, validDepartmentIds, organizationId);
        Set<UUID> validTeamIds = teams.stream().map(Team::getId).collect(Collectors.toSet());
        List<OrganizationMembership> members = resolveMembers(current, organizationId, validDepartmentIds, validTeamIds);
        Set<UUID> memberIds = members.stream().map(OrganizationMembership::getId).collect(Collectors.toSet());

        List<Project> projects = validDepartmentIds.isEmpty()
                ? List.of()
                : resolveProjects(current, scope, validDepartmentIds);
        Set<UUID> projectIds = projects.stream().map(Project::getId).collect(Collectors.toSet());
        boolean restrictToMembers = current.getRole() == Role.leader || current.getRole() == Role.employee;

        Map<ActivityStatus, Long> activityCounts = emptyActivityCounts();
        Map<UUID, SectorMemberWorkload> workload = Map.of();
        List<Activity> queue = List.of();
        if (!projectIds.isEmpty() && !memberIds.isEmpty()) {
            List<SectorActivityStatusCount> counts = restrictToMembers
                    ? activityRepository.countSectorActivitiesByStatusAndAssignee(projectIds, memberIds)
                    : activityRepository.countSectorActivitiesByStatus(projectIds);
            counts.forEach(count -> activityCounts.put(count.getStatus(), count.getTotal()));
            workload = activityRepository.summarizeSectorMemberWorkload(projectIds, memberIds).stream()
                    .collect(Collectors.toMap(SectorMemberWorkload::getMembershipId, Function.identity()));
            queue = restrictToMembers
                    ? activityRepository.findSectorQueueByAssignee(projectIds, memberIds, PageRequest.of(0, 12))
                    : activityRepository.findSectorQueue(projectIds, PageRequest.of(0, 12));
        }

        Map<UUID, SectorMemberWorkload> memberWorkload = workload;
        Map<UUID, Long> teamMemberCounts = members.stream()
                .filter(member -> member.getPrimaryTeamId() != null)
                .collect(Collectors.groupingBy(OrganizationMembership::getPrimaryTeamId, Collectors.counting()));

        return new SectorOverviewResponse(
                current.getRole(),
                departments.stream().map(department ->
                        new SectorOverviewResponse.DepartmentSummary(department.getId(), department.getName())).toList(),
                teams.stream().map(team -> new SectorOverviewResponse.TeamSummary(
                        team.getId(), team.getDepartment().getId(), team.getName(), teamMemberCounts.getOrDefault(team.getId(), 0L))).toList(),
                members.stream().map(member -> {
                    SectorMemberWorkload load = memberWorkload.get(member.getId());
                    return new SectorOverviewResponse.MemberSummary(
                            member.getId(), displayName(member), member.getRole(), member.getPrimaryDepartmentId(),
                            member.getPrimaryTeamId(), load == null ? 0 : load.getOpenActivities(),
                            load == null ? 0 : load.getEstimatedSeconds());
                }).toList(),
                projects.stream().map(project -> new SectorOverviewResponse.ProjectSummary(
                        project.getId(), project.getDepartment().getId(), project.getName(), project.isActive())).toList(),
                activityCounts,
                queue.stream().map(this::toActivitySummary).toList());
    }

    private List<Project> resolveProjects(OrganizationMembership current, Scope scope, Set<UUID> departmentIds) {
        if (current.getRole() == Role.admin || current.getRole() == Role.manager) {
            return projectRepository.findByDepartmentIdInAndIsActiveTrue(departmentIds);
        }
        List<Project> departmentProjects = projectRepository.findByDepartmentIdInAndIsActiveTrue(departmentIds);
        Set<UUID> departmentProjectIds = departmentProjects.stream()
                .map(Project::getId)
                .collect(Collectors.toSet());
        Set<UUID> visible = new HashSet<>();
        projectRepository.findByManagerMembershipId(current.getId()).forEach(project -> visible.add(project.getId()));
        projectAssignmentRepository.findProjectIdsByMembershipId(current.getId()).forEach(visible::add);
        Set<UUID> accessibleDepartmentIds = current.getRole() == Role.leader ? scope.departmentIds() : Set.of();
        if (!accessibleDepartmentIds.isEmpty()) {
            crossDepartmentProjectAccessRepository.findProjectIdsByDepartmentIdIn(accessibleDepartmentIds)
                    .forEach(visible::add);
        }
        visible.retainAll(departmentProjectIds);
        return departmentProjects.stream()
                .filter(project -> visible.contains(project.getId()))
                .toList();
    }

    private Scope resolveScope(OrganizationMembership membership, UUID organizationId) {
        if (membership.getRole() == Role.admin) {
            return new Scope(
                    departmentRepository.findByOrganizationId(organizationId).stream().map(Department::getId).collect(Collectors.toSet()),
                    Set.of());
        }
        if (membership.getRole() == Role.manager) {
            return new Scope(new HashSet<>(managerDepartmentRepository.findDepartmentIdsByMembershipId(membership.getId())), Set.of());
        }
        if (membership.getRole() == Role.leader) {
            Set<UUID> teamIds = leaderTeamRepository.findByMembershipId(membership.getId()).stream()
                    .map(leaderTeam -> leaderTeam.getTeam().getId())
                    .collect(Collectors.toSet());
            Set<UUID> departmentIds = teamIds.isEmpty() ? Set.of()
                    : teamRepository.findByIdInAndDepartment_Organization_Id(teamIds, organizationId).stream()
                            .map(team -> team.getDepartment().getId())
                            .collect(Collectors.toSet());
            return new Scope(departmentIds, teamIds);
        }
        return membership.getPrimaryDepartmentId() == null
                ? new Scope(Set.of(), Set.of())
                : new Scope(Set.of(membership.getPrimaryDepartmentId()),
                        membership.getPrimaryTeamId() == null ? Set.of() : Set.of(membership.getPrimaryTeamId()));
    }

    private List<Team> resolveTeams(Role role, Scope scope, Set<UUID> departmentIds, UUID organizationId) {
        if (departmentIds.isEmpty()) return List.of();
        if ((role == Role.employee || role == Role.leader) && scope.teamIds().isEmpty()) return List.of();
        List<Team> candidates = scope.teamIds().isEmpty()
                ? teamRepository.findByDepartmentIdIn(departmentIds)
                : teamRepository.findByIdInAndDepartment_Organization_Id(scope.teamIds(), organizationId);
        return candidates.stream().filter(team -> departmentIds.contains(team.getDepartment().getId())).toList();
    }

    private List<OrganizationMembership> resolveMembers(
            OrganizationMembership current, UUID organizationId, Set<UUID> departmentIds, Set<UUID> teamIds) {
        if (current.getRole() == Role.employee) return List.of(current);
        if (current.getRole() == Role.leader) {
            return teamIds.isEmpty() ? List.of(current)
                    : membershipRepository.findByOrganizationIdAndIsActiveTrueAndPrimaryTeamIdIn(organizationId, teamIds);
        }
        return departmentIds.isEmpty() ? List.of(current)
                : membershipRepository.findByOrganizationIdAndIsActiveTrueAndPrimaryDepartmentIdIn(organizationId, departmentIds);
    }

    private Map<ActivityStatus, Long> emptyActivityCounts() {
        Map<ActivityStatus, Long> counts = new EnumMap<>(ActivityStatus.class);
        for (ActivityStatus status : ActivityStatus.values()) counts.put(status, 0L);
        return counts;
    }

    private SectorOverviewResponse.ActivitySummary toActivitySummary(Activity activity) {
        return new SectorOverviewResponse.ActivitySummary(
                activity.getId(), activity.getProject().getId(), activity.getProject().getName(), activity.getTitle(),
                activity.getStatus(), activity.getPriority(), activity.getDueDate(), activity.getAssignedTo().getId(),
                displayName(activity.getAssignedTo()));
    }

    private String displayName(OrganizationMembership membership) {
        if (isSafeDisplayName(membership.getCustomUsername())) {
            return membership.getCustomUsername();
        }
        if (isSafeDisplayName(membership.getUser().getDisplayName())) {
            return membership.getUser().getDisplayName();
        }
        return membership.getUser().getUsername();
    }

    private boolean isSafeDisplayName(String value) {
        return value != null && !value.isBlank() && !value.contains("@");
    }

    private record Scope(Set<UUID> departmentIds, Set<UUID> teamIds) {}
}
