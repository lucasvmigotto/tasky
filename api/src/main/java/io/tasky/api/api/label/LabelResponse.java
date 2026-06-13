package io.tasky.api.api.label;

import java.time.Instant;
import java.util.UUID;

public record LabelResponse(
        UUID id,
        String slug,
        String displayName,
        boolean isSystem,
        UUID createdBy,
        Instant createdAt
) {}
