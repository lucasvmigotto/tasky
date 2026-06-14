package io.tasky.api.domain.activity;

import io.tasky.api.config.AppConfig;
import io.tasky.api.domain.label.Label;
import io.tasky.api.domain.label.LabelRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;
    private final ProjectRepository projectRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final LabelRepository labelRepository;
    private final PermissionService permissionService;

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            List<UUID> labelIds,
            List<UUID> parentActivityIds,
            SecurityUser creator
    ) {
        if (startDatetime.isAfter(endDatetime) || startDatetime.equals(endDatetime)) {
            throw new IllegalArgumentException("Start datetime must be before end datetime");
        }

        if (!AppConfig.isValidFibonacciWeight(weight)) {
            throw new IllegalArgumentException("Weight must be a Fibonacci number (1, 2, 3, 5, 8, or 13)");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        OrganizationMembership assignedTo = membershipRepository.findById(assignedToMembershipId)
                .orElseThrow(() -> new IllegalArgumentException("Assigned membership not found"));

        OrganizationMembership creatorMembership = permissionService.getMembership(creator.id(), project.getDepartment().getOrganization().getId())
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        boolean isSelfAssignment = assignedToMembershipId.equals(creatorMembership.getId());

        if (!isSelfAssignment && !permissionService.canCreateActivityFor(creatorMembership.getRole(), assignedTo.getRole())) {
            throw new SecurityException("Cannot create activity for user with role " + assignedTo.getRole());
        }

        Duration activityDuration = Duration.between(startDatetime, endDatetime);
        long totalMinutesToday = getTotalActivityMinutesForDate(assignedToMembershipId, startDatetime);
        if (totalMinutesToday + activityDuration.toMinutes() > assignedTo.getMaxDailyWorkMinutes()) {
            throw new IllegalArgumentException("Activity exceeds maximum daily work time");
        }

        Activity activity = Activity.builder()
                .project(project)
                .title(title)
                .description(description)
                .weight(weight)
                .startDatetime(startDatetime)
                .endDatetime(endDatetime)
                .createdBy(creatorMembership)
                .assignedTo(assignedTo)
                .build();

        activity = activityRepository.save(activity);

        if (labelIds != null && !labelIds.isEmpty()) {
            Set<ActivityLabel> activityLabels = new HashSet<>();
            for (UUID labelId : labelIds) {
                Label label = labelRepository.getReferenceById(labelId);
                activityLabels.add(new ActivityLabel(activity, label));
            }
            activity.setLabels(activityLabels);
            activity = activityRepository.save(activity);
        }

        if (parentActivityIds != null) {
            for (UUID parentId : parentActivityIds) {
                if (dependencyRepository.existsByParentActivityIdAndChildActivityId(parentId, activity.getId())) {
                    continue;
                }
                Activity parent = activityRepository.findById(parentId)
                        .orElseThrow(() -> new IllegalArgumentException("Parent activity not found: " + parentId));
                addDependencyInternal(parent, activity);
            }
        }

        return activity;
    }

    public void addDependency(UUID childId, UUID parentId) {
        Activity child = activityRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("Child activity not found"));
        Activity parent = activityRepository.findById(parentId)
                .orElseThrow(() -> new IllegalArgumentException("Parent activity not found"));
        addDependencyInternal(parent, child);
    }

    private void addDependencyInternal(Activity parent, Activity child) {
        if (parent.getId().equals(child.getId())) {
            throw new IllegalArgumentException("An activity cannot depend on itself");
        }

        if (wouldCreateCycle(parent, child)) {
            throw new IllegalArgumentException("Adding this dependency would create a cycle");
        }

        ActivityDependency dependency = ActivityDependency.builder()
                .parentActivity(parent)
                .childActivity(child)
                .build();
        dependencyRepository.save(dependency);
    }

    private boolean wouldCreateCycle(Activity parent, Activity child) {
        Set<UUID> visited = new HashSet<>();
        return wouldCreateCycleRecursive(parent.getId(), child.getId(), visited);
    }

    private boolean wouldCreateCycleRecursive(UUID currentId, UUID targetId, Set<UUID> visited) {
        if (currentId.equals(targetId)) {
            return true;
        }
        if (visited.contains(currentId)) {
            return false;
        }
        visited.add(currentId);
        List<ActivityDependency> deps = dependencyRepository.findByParentActivityId(currentId);
        for (ActivityDependency dep : deps) {
            if (wouldCreateCycleRecursive(dep.getChildActivity().getId(), targetId, visited)) {
                return true;
            }
        }
        return false;
    }

    public void removeDependency(UUID childId, UUID parentId) {
        dependencyRepository.findByParentActivityIdAndChildActivityId(parentId, childId)
                .ifPresent(dependencyRepository::delete);
    }

    public List<Activity> getActivitiesByProject(UUID projectId) {
        return activityRepository.findByProjectId(projectId);
    }

    public Activity getActivity(UUID activityId) {
        return activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
    }

    public void deleteActivity(UUID activityId) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        activityRepository.delete(activity);
    }

    private long getTotalActivityMinutesForDate(UUID membershipId, Instant date) {
        Instant dayStart = date.atZone(java.time.ZoneOffset.UTC).toLocalDate()
                .atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        Instant dayEnd = dayStart.plus(java.time.Duration.ofDays(1));

        List<Activity> activities = activityRepository.findByAssignedToId(membershipId);
        long totalMinutes = 0;
        for (Activity a : activities) {
            if (!a.getStartDatetime().isBefore(dayStart) && a.getEndDatetime().isBefore(dayEnd)) {
                totalMinutes += Duration.between(a.getStartDatetime(), a.getEndDatetime()).toMinutes();
            }
        }
        return totalMinutes;
    }

    public List<Activity> getActivitiesByDateRange(Instant from, Instant to, UUID assignedTo, UUID projectId) {
        var activities = activityRepository.findAll();
        var stream = activities.stream();
        if (from != null) stream = stream.filter(a -> !a.getEndDatetime().isBefore(from));
        if (to != null) stream = stream.filter(a -> !a.getStartDatetime().isAfter(to));
        if (assignedTo != null) stream = stream.filter(a -> a.getAssignedTo().getId().equals(assignedTo));
        if (projectId != null) stream = stream.filter(a -> a.getProject().getId().equals(projectId));
        return stream.toList();
    }
}
