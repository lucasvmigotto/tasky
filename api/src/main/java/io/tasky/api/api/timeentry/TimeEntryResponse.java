package io.tasky.api.api.timeentry;

import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import io.tasky.api.domain.timeentry.TimeEntryApprovalStatus;

public record TimeEntryResponse(
        UUID id,
        UUID organizationId,
        UUID membershipId,
        UUID userId,
        UUID projectId,
        UUID activityId,
        String description,
        Instant startTime,
        Instant endTime,
        Long durationSeconds,
        Long pausedSeconds,
        Instant pausedAt,
        TimeEntryApprovalStatus approvalStatus,
        Instant submittedAt,
        Instant approvedAt,
        UUID approvedBy,
        String rejectionComment,
        BigDecimal billingRateSnapshot,
        BigDecimal costRateSnapshot,
        boolean billable,
        List<String> tags,
        Instant createdAt
) {}
