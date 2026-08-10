package io.tasky.api.api.report;

import java.time.Instant;
import java.util.UUID;

public record ExportJobResponse(
        UUID id,
        String status,
        String format,
        String downloadUrl,
        Instant createdAt,
        Instant expiresAt
) {}
