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
public class ActivityCoreService {

    private final ActivityRepository activityRepository;
    private final ActivityChecklistItemRepository checklistRepository;
    private final ActivityDependencyRepository dependencyRepository;
    private final ProjectRepository projectRepository;
    private final ProjectColumnRepository projectColumnRepository;
    private final MembershipService membershipService;
    private final PermissionService permissionService;
    private final NotificationService notificationService;
    private final ActivityEventHelper eventHelper;
    private final ActivityDependencyService dependencyService;

    private static final int MAX_ACTIVITY_DEPTH = 5;
    private static final int REORDER_SPACING = 1000;
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
                dependencyService.addDependencyInternal(parent, activity);
            }
        }

        if (!activity.getAssignedTo().getId().equals(creatorMembership.getId())) {
            notificationService.createOnce(orgId, activity.getAssignedTo().getId(),
                    "activity:" + activity.getId() + ":assigned-on-create", "ACTIVITY_ASSIGNED",
                    "Nova atividade atribuida", activity.getTitle(), "activity", activity.getId());
        }

        return activity;
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
            eventHelper.appendEvent(orgId, saved, actorMembership, ActivityEventType.ASSIGNEE_CHANGED,
                    previousAssigneeId.toString(), saved.getAssignedTo().getId().toString(), null);
            notificationService.createOnce(orgId, saved.getAssignedTo().getId(),
                    mutationKey + ":assignee:" + saved.getAssignedTo().getId(), "ACTIVITY_ASSIGNED",
                    "Atividade atribuida a voce", saved.getTitle(), "activity", activityId);
        }
        if (status != null && previousStatus != saved.getStatus()) {
            eventHelper.appendEvent(orgId, saved, actorMembership, ActivityEventType.STATUS_CHANGED,
                    previousStatus.name(), saved.getStatus().name(), null);
            eventHelper.notifyAssignee(saved, mutationKey + ":status:" + saved.getStatus(), "ACTIVITY_STATUS_CHANGED",
                    "Status da atividade alterado", saved.getTitle() + ": " + eventHelper.statusLabel(saved.getStatus()));
        }
        if (dueDate != null && !Objects.equals(previousDueDate, saved.getDueDate())) {
            eventHelper.appendEvent(orgId, saved, actorMembership, ActivityEventType.DUE_DATE_CHANGED,
                    eventHelper.instantValue(previousDueDate), eventHelper.instantValue(saved.getDueDate()), null);
            eventHelper.notifyAssignee(saved, mutationKey + ":due-date:" + saved.getDueDate(), "ACTIVITY_DUE_DATE_CHANGED",
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
            eventHelper.appendEvent(orgId, saved, actorMembership, ActivityEventType.STATUS_CHANGED,
                    previousStatus.name(), saved.getStatus().name(), null);
            eventHelper.notifyAssignee(saved, "activity:" + activityId + ":after:" + previousUpdatedAt
                            + ":status:" + saved.getStatus(), "ACTIVITY_STATUS_CHANGED",
                    "Status da atividade alterado", saved.getTitle() + ": " + eventHelper.statusLabel(saved.getStatus()));
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

}
