package io.tasky.api.api.activity;

import io.tasky.api.domain.activity.ActivityStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ReorderActivitiesRequest(
        @NotNull ActivityStatus status,
        @NotEmpty List<UUID> activityIds
) {}
