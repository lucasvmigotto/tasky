package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ActivityResponse(
        UUID id,
        UUID projectId,
        String title,
        String description,
        short weight,
        Instant startDatetime,
        Instant endDatetime,
        UUID createdBy,
        UUID assignedTo,
        List<UUID> labelIds,
        List<UUID> parentActivityIds,
        Instant createdAt
) {}
