package io.tasky.api.api.report;

public record ApprovalGroupResponse(
        String approvalStatus,
        long seconds,
        long entries
) {}
