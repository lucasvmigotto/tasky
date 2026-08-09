package io.tasky.api.api.report;

import java.time.Instant;
import java.util.UUID;

public record ReportDetailedRow(
        UUID id,
        UUID projectId,
        String projectName,
        String projectColor,
        String glpiTicketId,
        String memberName,
        String description,
        Instant startTime,
        Instant endTime,
        double hours,
        String approvalStatus,
        double revenue,
        double cost,
        double margin,
        boolean billable
) {}
