package io.tasky.api.api.activity;

import io.tasky.api.domain.activity.ActivityEventType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ActivityFeedResponse(
        UUID id,
        ActivityEventType type,
        UUID actorMembershipId,
        String actorDisplayName,
        String actorAvatarUrl,
        UUID commentId,
        String commentContent,
        boolean commentDeleted,
        boolean canDelete,
        List<ActivityMentionResponse> mentions,
        String oldValue,
        String newValue,
        Instant createdAt
) {}
