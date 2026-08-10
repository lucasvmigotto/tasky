package io.tasky.api.api.projectcolumn;

import io.tasky.api.domain.activity.ActivityStatus;

public record UpdateProjectColumnRequest(
        String name,
        String color,
        ActivityStatus lifecycleStatus,
        Integer position
) {}
