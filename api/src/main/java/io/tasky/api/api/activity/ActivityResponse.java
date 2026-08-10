package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import io.tasky.api.domain.activity.ActivityPriority;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.activity.ActivityTaskType;

public record ActivityResponse(
        UUID id,
        UUID projectId,
        UUID parentActivityId,
        String title,
        String description,
        short weight,
        Instant startDatetime,
        Instant endDatetime,
        ActivityStatus status,
        ActivityTaskType taskType,
        ActivityPriority priority,
        Instant dueDate,
        int position,
        Instant completedAt,
        long estimatedSeconds,
        UUID createdBy,
        UUID assignedTo,
        List<UUID> assigneeIds,
        List<UUID> parentIds,
        int checklistTotal,
        int checklistCompleted,
        Instant createdAt,
        long version
) {}
