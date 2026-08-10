package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import io.tasky.api.domain.activity.ActivityPriority;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.activity.ActivityTaskType;

public record UpdateActivityRequest(
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
        List<UUID> assigneeMembershipIds
) {}
