package io.tasky.api.api.capacity;

import io.tasky.api.domain.capacity.LeaveStatus;
import io.tasky.api.domain.capacity.LeaveType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CreateMembershipLeaveRequest(
        UUID membershipId,
        LeaveType leaveType,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        LeaveStatus status,
        String note
) {}
