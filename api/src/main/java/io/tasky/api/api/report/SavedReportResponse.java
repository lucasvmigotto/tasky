package io.tasky.api.api.report;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SavedReportResponse(
        UUID id,
        String name,
        String description,
        Map<String, Object> params,
        Instant createdAt,
        Instant updatedAt,
        long version
) {}
