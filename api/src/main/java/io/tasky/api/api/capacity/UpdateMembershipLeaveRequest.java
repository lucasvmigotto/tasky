package io.tasky.api.api.capacity;

import io.tasky.api.domain.capacity.LeaveStatus;
import io.tasky.api.domain.capacity.LeaveType;

import java.time.LocalDate;

public record UpdateMembershipLeaveRequest(
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        LeaveStatus status,
        String note
) {}
