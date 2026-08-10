package io.tasky.api.api.projectcolumn;

import java.util.UUID;

public record ProjectColumnResponse(
        UUID id,
        UUID projectId,
        String name,
        int position,
        String color,
        String lifecycleStatus
) {}
