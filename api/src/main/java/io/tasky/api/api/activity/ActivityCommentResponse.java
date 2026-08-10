package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ActivityCommentResponse(
        UUID id,
        UUID activityId,
        UUID authorMembershipId,
        String authorName,
        String content,
        boolean deleted,
        boolean canDelete,
        List<ActivityMentionResponse> mentions,
        Instant createdAt,
        Instant updatedAt
) {}
