package io.tasky.api.domain.activity;

import io.tasky.api.api.activity.ActivityAttachmentResponse;
import io.tasky.api.api.activity.ActivityCommentResponse;
import io.tasky.api.api.activity.ActivityFeedResponse;
import io.tasky.api.api.activity.ActivityMentionResponse;
import io.tasky.api.api.activity.ActivityResponse;
import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * PHASE 3 (T-15): stable facade over the split activity services.
 * Controllers, SpEL policies and tests keep calling this bean; logic lives in
 * {@link ActivityCoreService}, {@link ActivityDependencyService} and
 * {@link ActivityCollaborationService}. Next step (when callers are rewired):
 * retire the facade.
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityCoreService coreService;
    private final ActivityDependencyService dependencyService;
    private final ActivityCollaborationService collaborationService;

    public Activity createActivity(
            UUID projectId,
            String title,
            String description,
            short weight,
            Instant startDatetime,
            Instant endDatetime,
            UUID assignedToMembershipId,
            List<UUID> parentActivityIds,
            SecurityUser creator) {
        return coreService.createActivity(projectId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityIds, creator);
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
            SecurityUser creator) {
        return coreService.createActivity(projectId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, parentActivityIds, creator);
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
            Instant dueDate) {
        return coreService.createActivity(projectId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, parentActivityIds, creator, taskType, priority, dueDate);
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
            List<UUID> assigneeMembershipIds) {
        return coreService.createActivity(projectId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, parentActivityIds, creator, taskType, priority, dueDate, assigneeMembershipIds);
    }

    public List<Activity> getActivitiesByProject(
            UUID orgId, UUID projectId) {
        return coreService.getActivitiesByProject(orgId, projectId);
    }

    public Activity getActivity(
            UUID orgId, UUID activityId) {
        return coreService.getActivity(orgId, activityId);
    }

    public void deleteActivity(
            UUID orgId, UUID activityId) {
        coreService.deleteActivity(orgId, activityId);
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
            SecurityUser actor) {
        return coreService.updateActivity(orgId, activityId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, status, position, taskType, priority, dueDate, actor);
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
            SecurityUser actor) {
        return coreService.updateActivity(orgId, activityId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, status, position, taskType, priority, dueDate, expectedVersion, actor);
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
            SecurityUser actor) {
        return coreService.updateActivity(orgId, activityId, title, description, weight, startDatetime, endDatetime, assignedToMembershipId, parentActivityId, estimatedSeconds, status, position, taskType, priority, dueDate, expectedVersion, assigneeMembershipIds, actor);
    }

    public Activity moveActivity(
            UUID orgId, UUID activityId, ActivityStatus status, Integer position, SecurityUser actor) {
        return coreService.moveActivity(orgId, activityId, status, position, actor);
    }

    public Activity moveActivity(
            UUID orgId, UUID activityId, ActivityStatus status, Integer position,
                                 Long expectedVersion, SecurityUser actor) {
        return coreService.moveActivity(orgId, activityId, status, position, expectedVersion, actor);
    }

    public Activity moveActivityToColumn(
            UUID orgId, UUID activityId, UUID columnId, Integer position,
                                         Long expectedVersion, SecurityUser actor) {
        return coreService.moveActivityToColumn(orgId, activityId, columnId, position, expectedVersion, actor);
    }

    public List<Activity> reorderActivities(
            UUID orgId, UUID projectId, ActivityStatus status,
                                            List<UUID> orderedActivityIds, SecurityUser actor) {
        return coreService.reorderActivities(orgId, projectId, status, orderedActivityIds, actor);
    }

    public PaginatedResponse<ActivityResponse> getActivitiesPage(
            UUID orgId, UUID membershipId,
                                                                  Set<UUID> readableProjectIds,
                                                                  Instant from, Instant to,
                                                                  UUID assignedTo, UUID projectId,
                                                                  Pageable pageable) {
        return coreService.getActivitiesPage(orgId, membershipId, readableProjectIds, from, to, assignedTo, projectId, pageable);
    }

    public List<ActivityResponse> getActivityResponsesByProject(
            UUID orgId, UUID projectId) {
        return coreService.getActivityResponsesByProject(orgId, projectId);
    }

    public ActivityResponse toActivityResponse(
            Activity activity) {
        return coreService.toActivityResponse(activity);
    }

    public List<ActivityResponse> toActivityResponses(
            List<Activity> activities) {
        return coreService.toActivityResponses(activities);
    }

    public void addDependency(
            UUID orgId, UUID childId, UUID parentId) {
        dependencyService.addDependency(orgId, childId, parentId);
    }

    public void removeDependency(
            UUID orgId, UUID childId, UUID parentId) {
        dependencyService.removeDependency(orgId, childId, parentId);
    }

    public List<ActivityCommentResponse> getCommentResponses(
            UUID orgId, UUID activityId,
                                                             UUID viewerMembershipId) {
        return collaborationService.getCommentResponses(orgId, activityId, viewerMembershipId);
    }

    public ActivityCommentResponse getCommentResponse(
            UUID orgId, UUID commentId, UUID viewerMembershipId) {
        return collaborationService.getCommentResponse(orgId, commentId, viewerMembershipId);
    }

    public List<ActivityFeedResponse> getFeedResponses(
            UUID orgId, UUID activityId, int limit,
                                                       UUID viewerMembershipId) {
        return collaborationService.getFeedResponses(orgId, activityId, limit, viewerMembershipId);
    }

    public List<ActivityMentionResponse> getMentionCandidateResponses(
            UUID orgId, UUID activityId, String query) {
        return collaborationService.getMentionCandidateResponses(orgId, activityId, query);
    }

    public List<ActivityAttachmentResponse> getAttachmentResponses(
            UUID orgId, UUID activityId) {
        return collaborationService.getAttachmentResponses(orgId, activityId);
    }

    public ActivityAttachmentResponse getAttachmentResponse(
            UUID orgId, UUID attachmentId) {
        return collaborationService.getAttachmentResponse(orgId, attachmentId);
    }

    public List<ActivityComment> getComments(
            UUID orgId, UUID activityId) {
        return collaborationService.getComments(orgId, activityId);
    }

    public ActivityComment addComment(
            UUID orgId, UUID activityId, OrganizationMembership author, String content,
                                      List<UUID> mentionMembershipIds) {
        return collaborationService.addComment(orgId, activityId, author, content, mentionMembershipIds);
    }

    public void deleteComment(
            UUID orgId, UUID activityId, UUID commentId, OrganizationMembership actor) {
        collaborationService.deleteComment(orgId, activityId, commentId, actor);
    }

    public List<ActivityEvent> getFeed(
            UUID orgId, UUID activityId, int limit) {
        return collaborationService.getFeed(orgId, activityId, limit);
    }

    public List<ActivityCommentMention> getCommentMentions(
            UUID commentId) {
        return collaborationService.getCommentMentions(commentId);
    }

    public List<ActivityCommentMention> getCommentMentions(
            Collection<UUID> commentIds) {
        return collaborationService.getCommentMentions(commentIds);
    }

    public List<OrganizationMembership> getMentionCandidates(
            UUID orgId, UUID activityId, String query) {
        return collaborationService.getMentionCandidates(orgId, activityId, query);
    }

    public List<ActivityAttachment> getAttachments(
            UUID orgId, UUID activityId) {
        return collaborationService.getAttachments(orgId, activityId);
    }

    public ActivityAttachment addAttachment(
            UUID orgId, UUID activityId, OrganizationMembership uploader,
                                            String fileName, String contentType, long sizeBytes, String url,
                                            UUID storedFileId) {
        return collaborationService.addAttachment(orgId, activityId, uploader, fileName, contentType, sizeBytes, url, storedFileId);
    }

    public void deleteAttachment(
            UUID orgId, UUID activityId, UUID attachmentId, OrganizationMembership actor) {
        collaborationService.deleteAttachment(orgId, activityId, attachmentId, actor);
    }

    public List<ActivityChecklistItem> getChecklist(
            UUID orgId, UUID activityId) {
        return collaborationService.getChecklist(orgId, activityId);
    }

    public ActivityChecklistItem addChecklistItem(
            UUID orgId, UUID activityId, String title) {
        return collaborationService.addChecklistItem(orgId, activityId, title);
    }

    public ActivityChecklistItem toggleChecklistItem(
            UUID orgId, UUID activityId, UUID itemId, OrganizationMembership actor) {
        return collaborationService.toggleChecklistItem(orgId, activityId, itemId, actor);
    }

    public void deleteChecklistItem(
            UUID orgId, UUID activityId, UUID itemId) {
        collaborationService.deleteChecklistItem(orgId, activityId, itemId);
    }
}
