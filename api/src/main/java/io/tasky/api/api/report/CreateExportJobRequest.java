package io.tasky.api.api.report;

import java.time.Instant;
import java.util.UUID;

public record CreateExportJobRequest(
        Instant from,
        Instant to,
        UUID projectId,
        UUID membershipId,
        String format
) {}
