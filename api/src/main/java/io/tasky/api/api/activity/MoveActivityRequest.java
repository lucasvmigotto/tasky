package io.tasky.api.api.activity;

import io.tasky.api.domain.activity.ActivityStatus;
import jakarta.validation.constraints.NotNull;

public record MoveActivityRequest(
        @NotNull ActivityStatus status,
        Integer position,
        Long expectedVersion
) {}
