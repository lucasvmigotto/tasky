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
import io.tasky.api.domain.notification.NotificationPreferenceType;
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
public class ActivityCollaborationService {


    private Activity getActivity(UUID orgId, UUID activityId) {
        return activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
    }

    private final ActivityRepository activityRepository;
    private final ActivityCommentRepository activityCommentRepository;
    private final ActivityCommentMentionRepository commentMentionRepository;
    private final ActivityEventRepository activityEventRepository;
    private final ActivityAttachmentRepository activityAttachmentRepository;
    private final ActivityChecklistItemRepository checklistRepository;
    private final StoredFileRepository storedFileRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final PermissionService permissionService;
    private final NotificationService notificationService;
    private final ActivityEventHelper eventHelper;
    @Transactional(readOnly = true)
    public List<ActivityCommentResponse> getCommentResponses(UUID orgId, UUID activityId,
                                                             UUID viewerMembershipId) {
        getActivity(orgId, activityId);
        List<ActivityComment> comments = activityCommentRepository.findByActivityIdWithAuthor(activityId);
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
        List<ActivityEvent> events = activityEventRepository.findPageWithActor(
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
                        "Voce foi mencionado em " + activity.getTitle(), normalizedContent, "activity", activityId,
                        NotificationPreferenceType.ACTIVITY_MENTION);
            }
        }
        eventHelper.appendEvent(orgId, activity, author, ActivityEventType.COMMENT_CREATED, null, null, comment);
        UUID assigneeId = activity.getAssignedTo() != null ? activity.getAssignedTo().getId() : null;
        if (assigneeId != null && !assigneeId.equals(author.getId()) && !uniqueMentionIds.contains(assigneeId)) {
            notificationService.createOnce(orgId, activity.getAssignedTo().getId(),
                    "activity-comment:" + comment.getId(), "ACTIVITY_COMMENT",
                    "Novo comentario em " + activity.getTitle(), normalizedContent, "activity", activityId);
        }
        return comment;
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
        eventHelper.appendEvent(orgId, comment.getActivity(), actor, ActivityEventType.COMMENT_DELETED,
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
