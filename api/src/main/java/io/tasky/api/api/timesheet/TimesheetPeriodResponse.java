package io.tasky.api.api.timesheet;

import io.tasky.api.domain.timesheet.TimesheetPeriodStatus;

import java.time.Instant;
import java.util.UUID;

public record TimesheetPeriodResponse(
        UUID id,
        UUID organizationId,
        UUID membershipId,
        Instant periodStart,
        Instant periodEnd,
        TimesheetPeriodStatus status,
        Instant submittedAt,
        Instant approvedAt,
        UUID approvedBy,
        String rejectionComment,
        long version,
        Instant createdAt,
        Instant updatedAt
) {}
