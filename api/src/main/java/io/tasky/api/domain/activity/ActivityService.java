package io.tasky.api.domain.activity;

import io.tasky.api.api.activity.ActivityAttachmentResponse;
import io.tasky.api.api.activity.ActivityCommentResponse;
import io.tasky.api.api.activity.ActivityFeedResponse;
import io.tasky.api.api.activity.ActivityMentionResponse;
import io.tasky.api.api.activity.ActivityResponse;
import io.tasky.api.api.common.ConflictException;
import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.config.AppConfig;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.projectcolumn.ProjectColumn;
import io.tasky.api.domain.projectcolumn.ProjectColumnRepository;
import io.tasky.api.domain.storage.StoredFile;
import io.tasky.api.domain.storage.StoredFileRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityService {

    private static final int MAX_ACTIVITY_DEPTH = 5;
    private static final int REORDER_SPACING = 1000;

    private final ActivityRepository activityRepository;
    private final ActivityCommentRepository activityCommentRepository;
    private final ActivityCommentMentionRepository commentMentionRepository;
    private final ActivityEventRepository activityEventRepository;
    private final ActivityAttachmentRepository activityAttachmentRepository;
    private final ActivityChecklistItemRepository checklistRepository;
    private final ActivityDependencyRepository dependencyRepository;
    private final ProjectRepository projectRepository;
    private final ProjectColumnRepository projectColumnRepository;
    private final StoredFileRepository storedFileRepository;
    private final MembershipService membershipService;
    private final OrganizationMembershipRepository membershipRepository;
    private final PermissionService permissionService;
    private final NotificationService notificationService;

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            List<UUID> parentActivityIds,
            SecurityUser creator
    ) {
        return createActivity(projectId, title, description, weight, startDatetime, endDatetime,
                assignedToMembershipId, null, null, parentActivityIds, creator);
    }

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            List<UUID> parentActivityIds,
            SecurityUser creator
    ) {
        return createActivity(projectId, title, description, weight, startDatetime, endDatetime,
                assignedToMembershipId, parentActivityId, estimatedSeconds, parentActivityIds, creator,
                null, null, null);
    }

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            List<UUID> parentActivityIds,
            SecurityUser creator,
            ActivityTaskType taskType,
            ActivityPriority priority,
            Instant dueDate
    ) {
        return createActivity(projectId, title, description, weight, startDatetime, endDatetime,
                assignedToMembershipId, parentActivityId, estimatedSeconds, parentActivityIds, creator,
                taskType, priority, dueDate, null);
    }

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            List<UUID> parentActivityIds,
            SecurityUser creator,
            ActivityTaskType taskType,
            ActivityPriority priority,
            Instant dueDate,
            List<UUID> assigneeMembershipIds
    ) {
        if (startDatetime.isAfter(endDatetime) || startDatetime.equals(endDatetime)) {
            throw new IllegalArgumentException("Start datetime must be before end datetime");
        }

        if (!AppConfig.isValidFibonacciWeight(weight)) {
            throw new IllegalArgumentException("Weight must be a Fibonacci number (1, 2, 3, 5, 8, or 13)");
        }

        UUID orgId = creator.activeOrganizationId();
        if (orgId == null) {
            throw new SecurityException("No active organization");
        }
        Project project = projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        OrganizationMembership creatorMembership = permissionService.getMembership(creator.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        OrganizationMembership assignedTo = resolveAssignmentTarget(
                orgId, assignedToMembershipId, creator, creatorMembership);

        Activity parentActivity = resolveParentActivity(orgId, projectId, null, parentActivityId);

        Duration activityDuration = Duration.between(startDatetime, endDatetime);
        long totalMinutesToday = getTotalActivityMinutesForDate(assignedToMembershipId, startDatetime);
        if (totalMinutesToday + activityDuration.toMinutes() > assignedTo.getMaxDailyWorkMinutes()) {
            throw new IllegalArgumentException("Activity exceeds maximum daily work time");
        }

        Activity activity = Activity.builder()
                .project(project)
                .parentActivity(parentActivity)
                .title(title)
                .description(description)
                .weight(weight)
                .startDatetime(startDatetime)
                .endDatetime(endDatetime)
                .createdBy(creatorMembership)
                .assignedTo(assignedTo)
                .status(ActivityStatus.TODO)
                .taskType(taskType != null ? taskType : ActivityTaskType.TASK)
                .priority(priority != null ? priority : ActivityPriority.NORMAL)
                .dueDate(dueDate)
                .position(activityRepository.maxPosition(projectId, ActivityStatus.TODO) + 1000)
                .estimatedSeconds(Math.max(0, estimatedSeconds != null ? estimatedSeconds : 0))
                .build();

        activity = activityRepository.save(activity);

        if (assigneeMembershipIds != null) {
            for (UUID assigneeMembershipId : assigneeMembershipIds) {
                if (assigneeMembershipId.equals(assignedTo.getId())) {
                    continue;
                }
                OrganizationMembership extra = membershipService.getVisibleActiveMembership(orgId, creator.id(), assigneeMembershipId);
                if (!permissionService.canCreateActivityFor(creatorMembership.getRole(), extra.getRole())) {
                    throw new SecurityException("Cannot assign activity to user with role " + extra.getRole());
                }
                activity.getAssignees().add(extra);
            }
        }

        if (parentActivityIds != null) {
            for (UUID parentId : parentActivityIds) {
                if (dependencyRepository.existsByParentActivityIdAndChildActivityId(parentId, activity.getId())) {
                    continue;
                }
                Activity parent = activityRepository.findByIdAndProject_Department_Organization_Id(parentId, orgId)
                        .orElseThrow(() -> new IllegalArgumentException("Parent activity not found: " + parentId));
                addDependencyInternal(parent, activity);
            }
        }

        if (!activity.getAssignedTo().getId().equals(creatorMembership.getId())) {
            notificationService.createOnce(orgId, activity.getAssignedTo().getId(),
                    "activity:" + activity.getId() + ":assigned-on-create", "ACTIVITY_ASSIGNED",
                    "Nova atividade atribuida", activity.getTitle(), "activity", activity.getId());
        }

        return activity;
    }

    public void addDependency(UUID orgId, UUID childId, UUID parentId) {
        Activity child = activityRepository.findByIdAndProject_Department_Organization_Id(childId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Child activity not found"));
        Activity parent = activityRepository.findByIdAndProject_Department_Organization_Id(parentId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Parent activity not found"));
        addDependencyInternal(parent, child);
    }

    private void addDependencyInternal(Activity parent, Activity child) {
        dependencyRepository.acquireProjectAdvisoryLock(parent.getProject().getId().toString());
        if (parent.getId().equals(child.getId())) {
            throw new IllegalArgumentException("An activity cannot depend on itself");
        }
        if (!parent.getProject().getId().equals(child.getProject().getId())) {
            throw new IllegalArgumentException("Dependencies must belong to the same project");
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
        return wouldCreateCycleRecursive(child.getId(), parent.getId(), visited);
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

    public void removeDependency(UUID orgId, UUID childId, UUID parentId) {
        Activity child = activityRepository.findByIdAndProject_Department_Organization_Id(childId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Child activity not found"));
        dependencyRepository.acquireProjectAdvisoryLock(child.getProject().getId().toString());
        dependencyRepository.findByParentActivityIdAndChildActivityId(parentId, childId)
                .filter(d -> d.getParentActivity() != null
                        && d.getParentActivity().getProject() != null
                        && d.getParentActivity().getProject().getDepartment() != null
                        && d.getParentActivity().getProject().getDepartment().getOrganization() != null
                        && d.getParentActivity().getProject().getDepartment().getOrganization().getId().equals(orgId))
                .ifPresent(dependencyRepository::delete);
    }

    public List<Activity> getActivitiesByProject(UUID orgId, UUID projectId) {
        return activityRepository.findByProjectIdAndProject_Department_Organization_Id(projectId, orgId);
    }

    public Activity getActivity(UUID orgId, UUID activityId) {
        return activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
    }

    public void deleteActivity(UUID orgId, UUID activityId) {
        Activity activity = getActivity(orgId, activityId);
        activityRepository.delete(activity);
    }

    public Activity updateActivity(
            UUID orgId,
            UUID activityId,
            String title,
            String description,
            Short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            ActivityStatus status,
            Integer position,
            ActivityTaskType taskType,
            ActivityPriority priority,
            Instant dueDate,
            SecurityUser actor
    ) {
        return updateActivity(orgId, activityId, title, description, weight, startDatetime, endDatetime,
                assignedToMembershipId, parentActivityId, estimatedSeconds, status, position,
                taskType, priority, dueDate, null, actor);
    }

    public Activity updateActivity(
            UUID orgId,
            UUID activityId,
            String title,
            String description,
            Short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            ActivityStatus status,
            Integer position,
            ActivityTaskType taskType,
            ActivityPriority priority,
            Instant dueDate,
            Long expectedVersion,
            SecurityUser actor
    ) {
        return updateActivity(orgId, activityId, title, description, weight, startDatetime, endDatetime,
                assignedToMembershipId, parentActivityId, estimatedSeconds, status, position,
                taskType, priority, dueDate, expectedVersion, null, actor);
    }

    public Activity updateActivity(
            UUID orgId,
            UUID activityId,
            String title,
            String description,
            Short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            UUID parentActivityId,
            Long estimatedSeconds,
            ActivityStatus status,
            Integer position,
            ActivityTaskType taskType,
            ActivityPriority priority,
            Instant dueDate,
            Long expectedVersion,
            List<UUID> assigneeMembershipIds,
            SecurityUser actor
    ) {
        Activity activity = getActivity(orgId, activityId);
        if (expectedVersion != null && activity.getVersion() != expectedVersion) {
            throw new ConflictException("Activity was modified concurrently; expected version " + expectedVersion
                    + " but current version is " + activity.getVersion());
        }
        UUID previousAssigneeId = activity.getAssignedTo().getId();
        ActivityStatus previousStatus = activity.getStatus();
        Instant previousDueDate = activity.getDueDate();
        Instant previousUpdatedAt = activity.getUpdatedAt();

        if (title != null && !title.isBlank()) {
            activity.setTitle(title);
        }
        if (description != null) {
            activity.setDescription(description);
        }
        if (weight != null) {
            if (!AppConfig.isValidFibonacciWeight(weight)) {
                throw new IllegalArgumentException("Weight must be a Fibonacci number (1, 2, 3, 5, 8, or 13)");
            }
            activity.setWeight(weight);
        }

        Instant start = startDatetime != null ? startDatetime : activity.getStartDatetime();
        Instant end = endDatetime != null ? endDatetime : activity.getEndDatetime();
        if (end.isBefore(start) || end.equals(start)) {
            throw new IllegalArgumentException("Start datetime must be before end datetime");
        }
        activity.setStartDatetime(start);
        activity.setEndDatetime(end);

        if (assignedToMembershipId != null) {
            OrganizationMembership actorMembership = permissionService.getMembership(actor.id(), orgId)
                    .orElseThrow(() -> new SecurityException("Not a member of this organization"));
            OrganizationMembership assigned = resolveAssignmentTarget(
                    orgId, assignedToMembershipId, actor, actorMembership);
            activity.setAssignedTo(assigned);
        }

        if (assigneeMembershipIds != null) {
            OrganizationMembership actorMembership = permissionService.getMembership(actor.id(), orgId)
                    .orElseThrow(() -> new SecurityException("Not a member of this organization"));
            List<OrganizationMembership> resolved = new ArrayList<>();
            for (UUID assigneeMembershipId : assigneeMembershipIds) {
                OrganizationMembership member = membershipService.getVisibleActiveMembership(orgId, actor.id(), assigneeMembershipId);
                if (!permissionService.canCreateActivityFor(actorMembership.getRole(), member.getRole())) {
                    throw new SecurityException("Cannot assign activity to user with role " + member.getRole());
                }
                resolved.add(member);
            }
            activity.getAssignees().clear();
            activity.getAssignees().addAll(resolved);
        }

        if (estimatedSeconds != null) {
            activity.setEstimatedSeconds(Math.max(0, estimatedSeconds));
        }

        if (parentActivityId != null) {
            activity.setParentActivity(resolveParentActivity(orgId, activity.getProject().getId(), activity.getId(), parentActivityId));
        }

        if (taskType != null) {
            activity.setTaskType(taskType);
        }
        if (priority != null) {
            activity.setPriority(priority);
        }
        if (dueDate != null) {
            activity.setDueDate(dueDate);
        }

        if (status != null || position != null) {
            applyStatus(activity, status != null ? status : activity.getStatus(), position);
        }

        Activity saved = activityRepository.save(activity);
        OrganizationMembership actorMembership = permissionService.getMembership(actor.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        String mutationKey = "activity:" + activityId + ":after:" + previousUpdatedAt;
        if (!previousAssigneeId.equals(saved.getAssignedTo().getId())) {
            appendEvent(orgId, saved, actorMembership, ActivityEventType.ASSIGNEE_CHANGED,
                    previousAssigneeId.toString(), saved.getAssignedTo().getId().toString(), null);
            notificationService.createOnce(orgId, saved.getAssignedTo().getId(),
                    mutationKey + ":assignee:" + saved.getAssignedTo().getId(), "ACTIVITY_ASSIGNED",
                    "Atividade atribuida a voce", saved.getTitle(), "activity", activityId);
        }
        if (status != null && previousStatus != saved.getStatus()) {
            appendEvent(orgId, saved, actorMembership, ActivityEventType.STATUS_CHANGED,
                    previousStatus.name(), saved.getStatus().name(), null);
            notifyAssignee(saved, mutationKey + ":status:" + saved.getStatus(), "ACTIVITY_STATUS_CHANGED",
                    "Status da atividade alterado", saved.getTitle() + ": " + statusLabel(saved.getStatus()));
        }
        if (dueDate != null && !Objects.equals(previousDueDate, saved.getDueDate())) {
            appendEvent(orgId, saved, actorMembership, ActivityEventType.DUE_DATE_CHANGED,
                    instantValue(previousDueDate), instantValue(saved.getDueDate()), null);
            notifyAssignee(saved, mutationKey + ":due-date:" + saved.getDueDate(), "ACTIVITY_DUE_DATE_CHANGED",
                    "Prazo da atividade alterado", saved.getTitle() + ": " + saved.getDueDate());
        }
        return saved;
    }

    private OrganizationMembership resolveAssignmentTarget(
            UUID orgId,
            UUID assignedToMembershipId,
            SecurityUser actor,
            OrganizationMembership actorMembership
    ) {
        if (assignedToMembershipId == null) {
            throw new IllegalArgumentException("Assigned membership is required");
        }
        OrganizationMembership assignedTo = membershipService.getVisibleActiveMembership(
                orgId, actor.id(), assignedToMembershipId);
        boolean selfAssignment = assignedTo.getId().equals(actorMembership.getId());
        if (!selfAssignment
                && !permissionService.canCreateActivityFor(actorMembership.getRole(), assignedTo.getRole())) {
            throw new SecurityException("Cannot assign activity to user with role " + assignedTo.getRole());
        }
        return assignedTo;
    }

    private Activity resolveParentActivity(UUID orgId, UUID projectId, UUID childId, UUID parentActivityId) {
        if (parentActivityId == null) {
            return null;
        }
        if (parentActivityId.equals(childId)) {
            throw new IllegalArgumentException("An activity cannot be its own parent");
        }
        Activity parent = activityRepository.findByIdAndProject_Department_Organization_Id(parentActivityId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Parent activity not found"));
        if (!parent.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Subtasks must belong to the same project");
        }
        if (childId != null && wouldCreateHierarchyCycle(parent, childId)) {
            throw new IllegalArgumentException("Parent activity would create a hierarchy cycle");
        }
        if (hierarchyDepth(parent) + 1 > MAX_ACTIVITY_DEPTH) {
            throw new IllegalArgumentException("Maximum hierarchy depth of " + MAX_ACTIVITY_DEPTH + " exceeded");
        }
        return parent;
    }

    private boolean wouldCreateHierarchyCycle(Activity parent, UUID childId) {
        Activity current = parent;
        while (current != null) {
            if (current.getId().equals(childId)) {
                return true;
            }
            current = current.getParentActivity();
        }
        return false;
    }

    private int hierarchyDepth(Activity activity) {
        int depth = 0;
        Activity current = activity;
        while (current != null) {
            depth++;
            current = current.getParentActivity();
        }
        return depth;
    }

    public Activity moveActivity(UUID orgId, UUID activityId, ActivityStatus status, Integer position, SecurityUser actor) {
        return moveActivity(orgId, activityId, status, position, null, actor);
    }

    public Activity moveActivity(UUID orgId, UUID activityId, ActivityStatus status, Integer position,
                                 Long expectedVersion, SecurityUser actor) {
        Activity activity = getActivity(orgId, activityId);
        if (expectedVersion != null && activity.getVersion() != expectedVersion) {
            throw new ConflictException("Activity was modified concurrently; expected version " + expectedVersion
                    + " but current version is " + activity.getVersion());
        }
        ActivityStatus previousStatus = activity.getStatus();
        Instant previousUpdatedAt = activity.getUpdatedAt();
        applyStatus(activity, status, position);
        Activity saved = activityRepository.save(activity);
        if (previousStatus != saved.getStatus()) {
            OrganizationMembership actorMembership = permissionService.getMembership(actor.id(), orgId)
                    .orElseThrow(() -> new SecurityException("Not a member of this organization"));
            appendEvent(orgId, saved, actorMembership, ActivityEventType.STATUS_CHANGED,
                    previousStatus.name(), saved.getStatus().name(), null);
            notifyAssignee(saved, "activity:" + activityId + ":after:" + previousUpdatedAt
                            + ":status:" + saved.getStatus(), "ACTIVITY_STATUS_CHANGED",
                    "Status da atividade alterado", saved.getTitle() + ": " + statusLabel(saved.getStatus()));
        }
        return saved;
    }

    public Activity moveActivityToColumn(UUID orgId, UUID activityId, UUID columnId, Integer position,
                                         Long expectedVersion, SecurityUser actor) {
        ProjectColumn column = projectColumnRepository.findByProjectIdAndId(activityProjectId(orgId, activityId), columnId)
                .orElseThrow(() -> new IllegalArgumentException("Column not found"));
        return moveActivity(orgId, activityId, column.getLifecycleStatus(), position, expectedVersion, actor);
    }

    private UUID activityProjectId(UUID orgId, UUID activityId) {
        return getActivity(orgId, activityId).getProject().getId();
    }

    private void applyStatus(Activity activity, ActivityStatus status, Integer position) {
        if (status == null) {
            throw new IllegalArgumentException("Status is required");
        }
        if (activity.getStatus() != ActivityStatus.DONE && status == ActivityStatus.DONE) {
            activity.setCompletedAt(Instant.now());
        }
        if (activity.getStatus() == ActivityStatus.DONE && status != ActivityStatus.DONE) {
            activity.setCompletedAt(null);
        }
        activity.setStatus(status);
        activity.setPosition(position != null ? position : activityRepository.maxPosition(activity.getProject().getId(), status) + 1000);
    }

    public List<Activity> reorderActivities(UUID orgId, UUID projectId, ActivityStatus status,
                                            List<UUID> orderedActivityIds, SecurityUser actor) {
        projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        List<UUID> currentIds = activityRepository.findActivityIdsByProjectIdAndStatus(projectId, status);
        if (orderedActivityIds == null || orderedActivityIds.size() != currentIds.size()
                || !new HashSet<>(currentIds).equals(new HashSet<>(orderedActivityIds))) {
            throw new IllegalArgumentException(
                    "Reorder must contain exactly the activities in this status column, with no duplicates or omissions");
        }
        int spacing = reorderSpacing(orderedActivityIds.size());
        List<Integer> positions = new ArrayList<>(orderedActivityIds.size());
        for (int i = 0; i < orderedActivityIds.size(); i++) {
            positions.add((i + 1) * spacing);
        }
        activityRepository.reassignPositions(projectId, status.name(), reorderPayload(orderedActivityIds, positions));
        return activityRepository.findByProjectIdAndStatusOrderByPositionAscIdAsc(projectId, status);
    }

    private int reorderSpacing(int size) {
        int spacing = REORDER_SPACING;
        if ((long) size * spacing > Integer.MAX_VALUE) {
            spacing = Math.max(1, Integer.MAX_VALUE / (size + 1));
        }
        return spacing;
    }

    private String reorderPayload(List<UUID> activityIds, List<Integer> positions) {
        StringBuilder payload = new StringBuilder("[");
        for (int i = 0; i < activityIds.size(); i++) {
            if (i > 0) {
                payload.append(',');
            }
            payload.append("{\"id\":\"").append(activityIds.get(i)).append("\",\"position\":").append(positions.get(i)).append('}');
        }
        return payload.append(']').toString();
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

    @Transactional(readOnly = true)
    public PaginatedResponse<ActivityResponse> getActivitiesPage(UUID orgId, UUID membershipId,
                                                                  Set<UUID> readableProjectIds,
                                                                  Instant from, Instant to,
                                                                  UUID assignedTo, UUID projectId,
                                                                  Pageable pageable) {
        Specification<Activity> spec = visibleActivitySpec(orgId, membershipId, readableProjectIds);

        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("endDatetime"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("startDatetime"), to));
        }
        if (assignedTo != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignedTo").get("id"), assignedTo));
        }
        if (projectId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("project").get("id"), projectId));
        }

        Page<Activity> result = activityRepository.findAll(spec, pageable);
        List<ActivityResponse> content = toResponses(result.getContent());
        return new PaginatedResponse<>(
                content, result.getTotalElements(), result.getTotalPages(),
                result.getSize(), result.getNumber());
    }

    private Specification<Activity> visibleActivitySpec(UUID orgId, UUID membershipId,
                                                        Set<UUID> readableProjectIds) {
        Specification<Activity> tenant = (root, query, cb) -> cb.equal(
                root.get("project").get("department").get("organization").get("id"), orgId);
        Specification<Activity> mine = (root, query, cb) -> cb.or(
                cb.equal(root.get("assignedTo").get("id"), membershipId),
                cb.equal(root.get("createdBy").get("id"), membershipId));
        if (readableProjectIds == null || readableProjectIds.isEmpty()) {
            return tenant.and(mine);
        }
        Specification<Activity> byProject =
                (root, query, cb) -> root.get("project").get("id").in(readableProjectIds);
        return tenant.and(byProject.or(mine));
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getActivityResponsesByProject(UUID orgId, UUID projectId) {
        return toResponses(getActivitiesByProject(orgId, projectId));
    }

    @Transactional(readOnly = true)
    public ActivityResponse toActivityResponse(Activity activity) {
        return toResponses(List.of(activity)).get(0);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> toActivityResponses(List<Activity> activities) {
        return toResponses(activities);
    }

    private List<ActivityResponse> toResponses(List<Activity> activities) {
        if (activities.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = activities.stream().map(Activity::getId).toList();
        Map<UUID, ActivityChecklistCount> counts = checklistRepository.countChecklistByActivityIds(ids).stream()
                .collect(Collectors.toMap(ActivityChecklistCount::getActivityId, Function.identity()));
        Map<UUID, List<UUID>> parentIdsByActivity = dependencyRepository.findParentRefsByChildActivityIdIn(ids).stream()
                .collect(Collectors.groupingBy(ActivityDependencyRef::getChildActivityId,
                        Collectors.mapping(ActivityDependencyRef::getParentActivityId, Collectors.toList())));
        Map<UUID, List<UUID>> assigneeIdsByActivity = activityRepository.findAssigneeRefsByActivityIds(ids).stream()
                .collect(Collectors.groupingBy(ActivityAssigneeRef::getActivityId,
                        Collectors.mapping(ActivityAssigneeRef::getMembershipId, Collectors.toList())));
        return activities.stream()
                .map(activity -> toResponse(activity,
                        counts.get(activity.getId()),
                        parentIdsByActivity.getOrDefault(activity.getId(), List.of()),
                        assigneeIdsByActivity.getOrDefault(activity.getId(), List.of())))
                .toList();
    }

    private ActivityResponse toResponse(Activity activity, ActivityChecklistCount checklistCount,
                                        List<UUID> parentIds, List<UUID> assigneeIds) {
        int checklistTotal = checklistCount != null ? (int) checklistCount.getTotal() : 0;
        int checklistCompleted = checklistCount != null ? (int) checklistCount.getCompleted() : 0;

        return new ActivityResponse(
                activity.getId(),
                activity.getProject().getId(),
                activity.getParentActivity() != null ? activity.getParentActivity().getId() : null,
                activity.getTitle(),
                activity.getDescription(),
                activity.getWeight(),
                activity.getStartDatetime(),
                activity.getEndDatetime(),
                activity.getStatus(),
                activity.getTaskType(),
                activity.getPriority(),
                activity.getDueDate(),
                activity.getPosition(),
                activity.getCompletedAt(),
                activity.getEstimatedSeconds(),
                activity.getCreatedBy().getId(),
                activity.getAssignedTo() != null ? activity.getAssignedTo().getId() : null,
                mergedAssigneeIds(activity, assigneeIds),
                parentIds,
                checklistTotal,
                checklistCompleted,
                activity.getCreatedAt(),
                activity.getVersion()
        );
    }

    private List<UUID> mergedAssigneeIds(Activity activity, List<UUID> assigneeIds) {
        LinkedHashSet<UUID> ids = new LinkedHashSet<>();
        if (activity.getAssignedTo() != null) {
            ids.add(activity.getAssignedTo().getId());
        }
        if (assigneeIds != null) {
            ids.addAll(assigneeIds);
        }
        return new ArrayList<>(ids);
    }

    @Transactional(readOnly = true)
    public List<ActivityCommentResponse> getCommentResponses(UUID orgId, UUID activityId,
                                                             UUID viewerMembershipId) {
        getActivity(orgId, activityId);
        List<ActivityComment> comments = activityCommentRepository.findByActivityIdOrderByCreatedAtAsc(activityId);
        Map<UUID, List<ActivityMentionResponse>> mentions = mentionsByComment(
                comments.stream().map(ActivityComment::getId).toList());
        return comments.stream()
                .map(comment -> toCommentResponse(comment, viewerMembershipId,
                        mentions.getOrDefault(comment.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityCommentResponse getCommentResponse(UUID orgId, UUID commentId, UUID viewerMembershipId) {
        ActivityComment comment = activityCommentRepository.findById(commentId)
                .filter(c -> c.getActivity().getProject().getDepartment().getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        List<ActivityMentionResponse> mentions = mentionsByComment(List.of(commentId))
                .getOrDefault(commentId, List.of());
        return toCommentResponse(comment, viewerMembershipId, mentions);
    }

    @Transactional(readOnly = true)
    public List<ActivityFeedResponse> getFeedResponses(UUID orgId, UUID activityId, int limit,
                                                       UUID viewerMembershipId) {
        getActivity(orgId, activityId);
        List<ActivityEvent> events = activityEventRepository.findByOrganizationIdAndActivityIdOrderByCreatedAtDescIdDesc(
                orgId, activityId, PageRequest.of(0, Math.min(Math.max(limit, 1), 100)));
        Map<UUID, List<ActivityMentionResponse>> mentions = mentionsByComment(events.stream()
                .map(ActivityEvent::getComment)
                .filter(Objects::nonNull)
                .map(ActivityComment::getId)
                .distinct()
                .toList());
        return events.stream()
                .map(event -> toFeedResponse(event, viewerMembershipId, mentions))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityMentionResponse> getMentionCandidateResponses(UUID orgId, UUID activityId, String query) {
        return getMentionCandidates(orgId, activityId, query).stream()
                .map(this::toMentionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityAttachmentResponse> getAttachmentResponses(UUID orgId, UUID activityId) {
        return getAttachments(orgId, activityId).stream()
                .map(this::toAttachmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ActivityAttachmentResponse getAttachmentResponse(UUID orgId, UUID attachmentId) {
        ActivityAttachment attachment = activityAttachmentRepository.findById(attachmentId)
                .filter(a -> a.getActivity().getProject().getDepartment().getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        return toAttachmentResponse(attachment);
    }

    private ActivityCommentResponse toCommentResponse(ActivityComment comment, UUID viewerMembershipId,
                                                      List<ActivityMentionResponse> mentions) {
        String name = displayName(comment.getAuthor());
        return new ActivityCommentResponse(
                comment.getId(),
                comment.getActivity().getId(),
                comment.getAuthor().getId(),
                name,
                comment.getContent(),
                comment.isDeleted(),
                !comment.isDeleted() && comment.getAuthor().getId().equals(viewerMembershipId),
                mentions,
                comment.getCreatedAt(),
                comment.getUpdatedAt());
    }

    private ActivityFeedResponse toFeedResponse(ActivityEvent event, UUID viewerMembershipId,
                                                Map<UUID, List<ActivityMentionResponse>> mentions) {
        ActivityComment comment = event.getComment();
        return new ActivityFeedResponse(
                event.getId(),
                event.getEventType(),
                event.getActor().getId(),
                displayName(event.getActor()),
                event.getActor().getUser().getAvatarUrl(),
                comment != null ? comment.getId() : null,
                comment != null ? comment.getContent() : null,
                comment != null && comment.isDeleted(),
                comment != null && !comment.isDeleted() && comment.getAuthor().getId().equals(viewerMembershipId),
                comment != null ? mentions.getOrDefault(comment.getId(), List.of()) : List.of(),
                event.getOldValue(),
                event.getNewValue(),
                event.getCreatedAt());
    }

    private Map<UUID, List<ActivityMentionResponse>> mentionsByComment(List<UUID> commentIds) {
        return getCommentMentions(commentIds).stream()
                .collect(Collectors.groupingBy(
                        mention -> mention.getComment().getId(),
                        Collectors.mapping(
                                mention -> toMentionResponse(mention.getMentionedMembership()),
                                Collectors.toList())));
    }

    private ActivityMentionResponse toMentionResponse(OrganizationMembership membership) {
        return new ActivityMentionResponse(
                membership.getId(),
                displayName(membership),
                membership.getUser().getAvatarUrl());
    }

    private ActivityAttachmentResponse toAttachmentResponse(ActivityAttachment attachment) {
        String name = attachment.getUploadedBy().getCustomUsername() != null
                ? attachment.getUploadedBy().getCustomUsername()
                : attachment.getUploadedBy().getUser().getUsername();
        return new ActivityAttachmentResponse(
                attachment.getId(),
                attachment.getActivity().getId(),
                attachment.getUploadedBy().getId(),
                name,
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getStorageUrl(),
                attachment.getCreatedAt());
    }


    public List<ActivityComment> getComments(UUID orgId, UUID activityId) {
        getActivity(orgId, activityId);
        return activityCommentRepository.findByActivityIdOrderByCreatedAtAsc(activityId);
    }

    public ActivityComment addComment(UUID orgId, UUID activityId, OrganizationMembership author, String content,
                                      List<UUID> mentionMembershipIds) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Comment content is required");
        }
        String normalizedContent = content.trim();
        if (normalizedContent.length() > 4000) {
            throw new IllegalArgumentException("Comment content must not exceed 4000 characters");
        }
        List<UUID> requestedMentions = mentionMembershipIds != null ? mentionMembershipIds : List.of();
        if (requestedMentions.size() > 20) {
            throw new IllegalArgumentException("A comment can mention at most 20 memberships");
        }
        Activity activity = getActivity(orgId, activityId);
        if (!author.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        Set<UUID> uniqueMentionIds = new LinkedHashSet<>(requestedMentions);
        List<OrganizationMembership> mentionedMemberships = uniqueMentionIds.stream()
                .map(membershipId -> membershipRepository.findByIdAndOrganizationIdAndIsActiveTrue(membershipId, orgId)
                        .orElseThrow(() -> new IllegalArgumentException("Mentioned membership is not active in this organization")))
                .peek(membership -> {
                    if (!canMembershipReadActivity(membership, activityId, orgId)) {
                        throw new SecurityException("Mentioned membership cannot read this activity");
                    }
                })
                .toList();

        ActivityComment comment = activityCommentRepository.save(ActivityComment.builder()
                .activity(activity)
                .author(author)
                .content(normalizedContent)
                .deleted(false)
                .build());
        for (OrganizationMembership mentioned : mentionedMemberships) {
            commentMentionRepository.save(ActivityCommentMention.builder()
                    .comment(comment)
                    .mentionedMembership(mentioned)
                    .build());
            if (!mentioned.getId().equals(author.getId())) {
                notificationService.createOnce(orgId, mentioned.getId(),
                        "activity-comment:" + comment.getId() + ":mention:" + mentioned.getId(), "ACTIVITY_MENTION",
                        "Voce foi mencionado em " + activity.getTitle(), normalizedContent, "activity", activityId);
            }
        }
        appendEvent(orgId, activity, author, ActivityEventType.COMMENT_CREATED, null, null, comment);
        UUID assigneeId = activity.getAssignedTo() != null ? activity.getAssignedTo().getId() : null;
        if (assigneeId != null && !assigneeId.equals(author.getId()) && !uniqueMentionIds.contains(assigneeId)) {
            notificationService.createOnce(orgId, activity.getAssignedTo().getId(),
                    "activity-comment:" + comment.getId(), "ACTIVITY_COMMENT",
                    "Novo comentario em " + activity.getTitle(), normalizedContent, "activity", activityId);
        }
        return comment;
    }

    private void notifyAssignee(Activity activity, String eventKey, String type, String title, String body) {
        notificationService.createOnce(activity.getProject().getDepartment().getOrganization().getId(),
                activity.getAssignedTo().getId(), eventKey, type, title, body, "activity", activity.getId());
    }

    private String statusLabel(ActivityStatus status) {
        return switch (status) {
            case TODO -> "A fazer";
            case IN_PROGRESS -> "Em andamento";
            case IN_TESTING -> "Em testes";
            case DONE -> "Concluida";
            case BLOCKED -> "Bloqueada";
            case CANCELED -> "Cancelada";
        };
    }

    public void deleteComment(UUID orgId, UUID activityId, UUID commentId, OrganizationMembership actor) {
        getActivity(orgId, activityId);
        ActivityComment comment = activityCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        if (!comment.getActivity().getId().equals(activityId)) {
            throw new SecurityException("Comment does not belong to this activity");
        }
        if (!comment.getAuthor().getId().equals(actor.getId())) {
            throw new SecurityException("You can only delete your own comments");
        }
        if (comment.isDeleted()) {
            return;
        }
        comment.setDeleted(true);
        comment.setContent("[comentario removido]");
        activityCommentRepository.save(comment);
        appendEvent(orgId, comment.getActivity(), actor, ActivityEventType.COMMENT_DELETED,
                null, null, comment);
    }

    @Transactional(readOnly = true)
    public List<ActivityEvent> getFeed(UUID orgId, UUID activityId, int limit) {
        getActivity(orgId, activityId);
        return activityEventRepository.findByOrganizationIdAndActivityIdOrderByCreatedAtDescIdDesc(
                orgId, activityId, PageRequest.of(0, Math.min(Math.max(limit, 1), 100)));
    }

    @Transactional(readOnly = true)
    public List<ActivityCommentMention> getCommentMentions(UUID commentId) {
        return commentMentionRepository.findByCommentIdOrderByCreatedAtAscIdAsc(commentId);
    }

    @Transactional(readOnly = true)
    public List<ActivityCommentMention> getCommentMentions(Collection<UUID> commentIds) {
        return commentIds.isEmpty()
                ? List.of()
                : commentMentionRepository.findByCommentIdInOrderByCreatedAtAscIdAsc(commentIds);
    }

    @Transactional(readOnly = true)
    public List<OrganizationMembership> getMentionCandidates(UUID orgId, UUID activityId, String query) {
        getActivity(orgId, activityId);
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return membershipRepository.findByOrganizationIdAndIsActiveTrueOrderByUser_UsernameAscIdAsc(orgId).stream()
                .filter(membership -> canMembershipReadActivity(membership, activityId, orgId))
                .filter(membership -> normalizedQuery.isEmpty()
                        || displayName(membership).toLowerCase(Locale.ROOT).contains(normalizedQuery))
                .limit(50)
                .toList();
    }

    private boolean canMembershipReadActivity(OrganizationMembership membership, UUID activityId, UUID orgId) {
        SecurityUser mentionedUser = SecurityUser.builder()
                .id(membership.getUser().getId())
                .email(membership.getUser().getEmail())
                .username(membership.getUser().getUsername())
                .activeOrganizationId(orgId)
                .role(membership.getRole())
                .build();
        return permissionService.canReadActivity(mentionedUser, activityId);
    }

    private String displayName(OrganizationMembership membership) {
        if (membership.getCustomUsername() != null && !membership.getCustomUsername().isBlank()) {
            return membership.getCustomUsername();
        }
        if (membership.getUser().getDisplayName() != null && !membership.getUser().getDisplayName().isBlank()) {
            return membership.getUser().getDisplayName();
        }
        return membership.getUser().getUsername();
    }

    private void appendEvent(UUID orgId, Activity activity, OrganizationMembership actor, ActivityEventType type,
                             String oldValue, String newValue, ActivityComment comment) {
        activityEventRepository.save(ActivityEvent.builder()
                .organizationId(orgId)
                .activity(activity)
                .actor(actor)
                .comment(comment)
                .eventType(type)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }

    private String instantValue(Instant value) {
        return value != null ? value.toString() : null;
    }

    public List<ActivityAttachment> getAttachments(UUID orgId, UUID activityId) {
        getActivity(orgId, activityId);
        return activityAttachmentRepository.findByActivityIdAndDeletedFalseOrderByCreatedAtDesc(activityId);
    }

    public ActivityAttachment addAttachment(UUID orgId, UUID activityId, OrganizationMembership uploader,
                                            String fileName, String contentType, long sizeBytes, String url,
                                            UUID storedFileId) {
        Activity activity = getActivity(orgId, activityId);
        if (!uploader.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        String storageUrl;
        String effectiveName = fileName;
        String effectiveType = contentType;
        long effectiveSize = sizeBytes;
        if (storedFileId != null) {
            StoredFile stored = storedFileRepository.findByIdAndOrganizationIdAndDeletedFalse(storedFileId, orgId)
                    .orElseThrow(() -> new IllegalArgumentException("File not found"));
            storageUrl = "/api/v1/files/" + stored.getId();
            effectiveName = stored.getFileName();
            effectiveType = stored.getContentType();
            effectiveSize = stored.getSizeBytes();
        } else {
            if (fileName == null || fileName.isBlank() || contentType == null || contentType.isBlank()
                    || url == null || url.isBlank()) {
                throw new IllegalArgumentException("Attachment metadata is required");
            }
            storageUrl = requireHttpsUrl(url);
        }
        if (effectiveSize < 0 || effectiveSize > 50L * 1024 * 1024) {
            throw new IllegalArgumentException("Attachment size is invalid");
        }
        return activityAttachmentRepository.save(ActivityAttachment.builder()
                .activity(activity)
                .uploadedBy(uploader)
                .fileName(effectiveName.trim())
                .contentType(effectiveType.trim())
                .sizeBytes(effectiveSize)
                .storageUrl(storageUrl)
                .deleted(false)
                .build());
    }

    private String requireHttpsUrl(String value) {
        try {
            URI uri = new URI(value.trim());
            if (!uri.isAbsolute() || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                throw new IllegalArgumentException("Attachment URL must be an absolute HTTPS URL");
            }
            return uri.toString();
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Attachment URL must be an absolute HTTPS URL", e);
        }
    }

    public void deleteAttachment(UUID orgId, UUID activityId, UUID attachmentId, OrganizationMembership actor) {
        getActivity(orgId, activityId);
        ActivityAttachment attachment = activityAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        if (!attachment.getActivity().getId().equals(activityId)) {
            throw new SecurityException("Attachment does not belong to this activity");
        }
        if (!attachment.getUploadedBy().getId().equals(actor.getId())) {
            throw new SecurityException("You can only delete your own attachments");
        }
        attachment.setDeleted(true);
        activityAttachmentRepository.save(attachment);
    }

    public List<ActivityChecklistItem> getChecklist(UUID orgId, UUID activityId) {
        getActivity(orgId, activityId);
        return checklistRepository.findByActivityIdOrderByPositionAsc(activityId);
    }

    public ActivityChecklistItem addChecklistItem(UUID orgId, UUID activityId, String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Checklist item title is required");
        }
        getActivity(orgId, activityId);
        long count = checklistRepository.countByActivityId(activityId);
        ActivityChecklistItem item = ActivityChecklistItem.builder()
                .activity(activityRepository.getReferenceById(activityId))
                .title(title.trim())
                .completed(false)
                .position((int) count * 1000)
                .build();
        return checklistRepository.save(item);
    }

    public ActivityChecklistItem toggleChecklistItem(UUID orgId, UUID activityId, UUID itemId, OrganizationMembership actor) {
        getActivity(orgId, activityId);
        ActivityChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Checklist item not found"));
        if (!item.getActivity().getId().equals(activityId)) {
            throw new SecurityException("Checklist item does not belong to this activity");
        }
        item.setCompleted(!item.isCompleted());
        if (item.isCompleted()) {
            item.setCompletedAt(Instant.now());
            item.setCompletedBy(actor);
        } else {
            item.setCompletedAt(null);
            item.setCompletedBy(null);
        }
        return checklistRepository.save(item);
    }

    public void deleteChecklistItem(UUID orgId, UUID activityId, UUID itemId) {
        getActivity(orgId, activityId);
        ActivityChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Checklist item not found"));
        if (!item.getActivity().getId().equals(activityId)) {
            throw new SecurityException("Checklist item does not belong to this activity");
        }
        checklistRepository.delete(item);
    }
}
