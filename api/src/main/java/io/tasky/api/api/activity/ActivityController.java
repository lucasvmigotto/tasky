package io.tasky.api.api.activity;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityAttachment;
import io.tasky.api.domain.activity.ActivityChecklistItem;
import io.tasky.api.domain.activity.ActivityComment;
import io.tasky.api.domain.activity.ActivityService;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final PermissionService permissionService;

    @PostMapping("/projects/{projectId}/activities")
    public ResponseEntity<ActivityResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateActivityRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadProject(user, projectId)) {
            throw new SecurityException("Project not found in your organization");
        }
        Activity activity = activityService.createActivity(
                projectId,
                request.title(),
                request.description(),
                request.weight(),
                request.startDatetime(),
                request.endDatetime(),
                request.assignedToMembershipId(),
                request.parentActivityId(),
                request.estimatedSeconds(),
                request.parentActivityIds(),
                user,
                request.taskType(),
                request.priority(),
                request.dueDate()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.toActivityResponse(activity));
    }

    @GetMapping("/projects/{projectId}/activities")
    public ResponseEntity<List<ActivityResponse>> listByProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadProject(user, projectId)) {
            throw new SecurityException("Project not found");
        }
        return ResponseEntity.ok(activityService.getActivityResponsesByProject(orgId, projectId));
    }

    @GetMapping("/activities/{activityId}")
    public ResponseEntity<ActivityResponse> getById(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        Activity activity = activityService.getActivity(orgId, activityId);
        return ResponseEntity.ok(activityService.toActivityResponse(activity));
    }

    @GetMapping("/activities")
    public ResponseEntity<PaginatedResponse<ActivityResponse>> query(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("assignedTo") Optional<UUID> assignedTo,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "1000") int size,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        Set<UUID> readableProjectIds = permissionService.readableProjectIds(user, orgId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 5000),
                Sort.by(Sort.Direction.DESC, "startDatetime", "id"));

        return ResponseEntity.ok(activityService.getActivitiesPage(
                orgId, membership.getId(), readableProjectIds,
                from.orElse(null), to.orElse(null),
                assignedTo.orElse(null), projectId.orElse(null),
                pageable));
    }

    @PutMapping("/activities/{activityId}")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #activityId)")
    public ResponseEntity<ActivityResponse> update(
            @PathVariable UUID activityId,
            @Valid @RequestBody UpdateActivityRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        Activity activity = activityService.updateActivity(
                orgId,
                activityId,
                request.title(),
                request.description(),
                request.weight(),
                request.startDatetime(),
                request.endDatetime(),
                request.assignedToMembershipId(),
                request.parentActivityId(),
                request.estimatedSeconds(),
                request.status(),
                request.position(),
                request.taskType(),
                request.priority(),
                request.dueDate(),
                request.expectedVersion(),
                user
        );
        return ResponseEntity.ok(activityService.toActivityResponse(activity));
    }

    @PatchMapping("/activities/{activityId}/move")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #activityId)")
    public ResponseEntity<ActivityResponse> move(
            @PathVariable UUID activityId,
            @Valid @RequestBody MoveActivityRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        Activity activity = activityService.moveActivity(orgId, activityId, request.status(), request.position(),
                request.expectedVersion(), user);
        return ResponseEntity.ok(activityService.toActivityResponse(activity));
    }

    @PostMapping("/projects/{projectId}/activities/reorder")
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<List<ActivityResponse>> reorder(
            @PathVariable UUID projectId,
            @Valid @RequestBody ReorderActivitiesRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        List<Activity> activities = activityService.reorderActivities(
                orgId, projectId, request.status(), request.activityIds(), user);
        return ResponseEntity.ok(activityService.toActivityResponses(activities));
    }

    @DeleteMapping("/activities/{activityId}")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #activityId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        activityService.deleteActivity(orgId, activityId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/activities/{activityId}/comments")
    public ResponseEntity<List<ActivityCommentResponse>> comments(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        return ResponseEntity.ok(activityService.getCommentResponses(orgId, activityId, membership.getId()));
    }

    @PostMapping("/activities/{activityId}/comments")
    public ResponseEntity<ActivityCommentResponse> addComment(
            @PathVariable UUID activityId,
            @Valid @RequestBody CreateActivityCommentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        ActivityComment comment = activityService.addComment(
                orgId, activityId, membership, request.content(), request.mentionMembershipIds());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(activityService.getCommentResponse(orgId, comment.getId(), membership.getId()));
    }

    @DeleteMapping("/activities/{activityId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID activityId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        activityService.deleteComment(orgId, activityId, commentId, membership);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/activities/{activityId}/feed")
    public ResponseEntity<List<ActivityFeedResponse>> feed(
            @PathVariable UUID activityId,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        return ResponseEntity.ok(activityService.getFeedResponses(orgId, activityId, limit, membership.getId()));
    }

    @GetMapping("/activities/{activityId}/mention-candidates")
    public ResponseEntity<List<ActivityMentionResponse>> mentionCandidates(
            @PathVariable UUID activityId,
            @RequestParam(value = "q", required = false) String query,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        return ResponseEntity.ok(activityService.getMentionCandidateResponses(orgId, activityId, query));
    }

    @GetMapping("/activities/{activityId}/attachments")
    public ResponseEntity<List<ActivityAttachmentResponse>> attachments(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        return ResponseEntity.ok(activityService.getAttachmentResponses(orgId, activityId));
    }

    @PostMapping("/activities/{activityId}/attachments")
    public ResponseEntity<ActivityAttachmentResponse> addAttachment(
            @PathVariable UUID activityId,
            @Valid @RequestBody CreateActivityAttachmentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        ActivityAttachment attachment = activityService.addAttachment(
                orgId, activityId, membership, request.fileName(), request.contentType(), request.sizeBytes(), request.url());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(activityService.getAttachmentResponse(orgId, attachment.getId()));
    }

    @DeleteMapping("/activities/{activityId}/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID activityId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        activityService.deleteAttachment(orgId, activityId, attachmentId, membership);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/activities/{childId}/dependencies")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #childId)")
    public ResponseEntity<Void> addDependency(
            @PathVariable UUID childId,
            @Valid @RequestBody AddDependencyRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        activityService.addDependency(orgId, childId, request.parentActivityId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/activities/{childId}/dependencies/{parentId}")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #childId)")
    public ResponseEntity<Void> removeDependency(
            @PathVariable UUID childId,
            @PathVariable UUID parentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        activityService.removeDependency(orgId, childId, parentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/activities/{activityId}/checklist")
    public ResponseEntity<List<ActivityChecklistItemResponse>> checklist(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        List<ActivityChecklistItemResponse> items = activityService.getChecklist(orgId, activityId).stream()
                .map(this::toChecklistItemResponse)
                .toList();
        return ResponseEntity.ok(items);
    }

    @PostMapping("/activities/{activityId}/checklist")
    public ResponseEntity<ActivityChecklistItemResponse> addChecklistItem(
            @PathVariable UUID activityId,
            @Valid @RequestBody CreateActivityChecklistItemRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        ActivityChecklistItem item = activityService.addChecklistItem(orgId, activityId, request.title());
        return ResponseEntity.status(HttpStatus.CREATED).body(toChecklistItemResponse(item));
    }

    @PatchMapping("/activities/{activityId}/checklist/{itemId}")
    public ResponseEntity<ActivityChecklistItemResponse> toggleChecklistItem(
            @PathVariable UUID activityId,
            @PathVariable UUID itemId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        ActivityChecklistItem item = activityService.toggleChecklistItem(orgId, activityId, itemId, membership);
        return ResponseEntity.ok(toChecklistItemResponse(item));
    }

    @DeleteMapping("/activities/{activityId}/checklist/{itemId}")
    public ResponseEntity<Void> deleteChecklistItem(
            @PathVariable UUID activityId,
            @PathVariable UUID itemId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadActivity(user, activityId)) {
            throw new SecurityException("Activity not found");
        }
        activityService.deleteChecklistItem(orgId, activityId, itemId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private ActivityChecklistItemResponse toChecklistItemResponse(ActivityChecklistItem item) {
        return new ActivityChecklistItemResponse(
                item.getId(),
                item.getActivity().getId(),
                item.getTitle(),
                item.isCompleted(),
                item.getPosition(),
                item.getCompletedBy() != null ? item.getCompletedBy().getId() : null,
                item.getCompletedAt(),
                item.getCreatedAt());
    }
}
