package io.tasky.api.api.report;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReportDetailedRow(
        UUID id,
        String projectName,
        String memberName,
        String description,
        Instant startTime,
        Instant endTime,
        double hours,
        String approvalStatus,
        double revenue,
        double cost,
        double margin,
        boolean billable,
        List<String> tags
) {}
