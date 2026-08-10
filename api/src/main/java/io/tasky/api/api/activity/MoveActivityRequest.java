package io.tasky.api.api.activity;

import io.tasky.api.domain.activity.ActivityStatus;

import java.util.UUID;

public record MoveActivityRequest(
        ActivityStatus status,
        UUID columnId,
        Integer position,
        Long expectedVersion
) {}
