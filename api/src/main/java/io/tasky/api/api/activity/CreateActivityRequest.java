package io.tasky.api.api.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import io.tasky.api.domain.activity.ActivityPriority;
import io.tasky.api.domain.activity.ActivityTaskType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateActivityRequest(
        @NotBlank String title,
        String description,
        short weight,
        @NotNull Instant startDatetime,
        @NotNull Instant endDatetime,
        @NotNull UUID assignedToMembershipId,
        UUID parentActivityId,
        Long estimatedSeconds,
        List<UUID> labelIds,
        List<UUID> parentActivityIds,
        ActivityTaskType taskType,
        ActivityPriority priority,
        Instant dueDate
) {}
