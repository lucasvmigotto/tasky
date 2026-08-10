package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.UUID;

public record ActivityChecklistItemResponse(
        UUID id,
        UUID activityId,
        String title,
        boolean completed,
        int position,
        UUID completedBy,
        Instant completedAt,
        Instant createdAt
) {}
