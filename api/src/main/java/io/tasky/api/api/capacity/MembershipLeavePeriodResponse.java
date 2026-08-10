package io.tasky.api.api.capacity;

import io.tasky.api.domain.capacity.LeaveStatus;
import io.tasky.api.domain.capacity.LeaveType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MembershipLeavePeriodResponse(
        UUID id,
        UUID membershipId,
        LeaveType leaveType,
        LeaveStatus status,
        LocalDate startDate,
        LocalDate endDate,
        String note,
        Instant createdAt
) {}
