package io.tasky.api.api.report;

public record BillableGroupResponse(
        boolean billable,
        long seconds,
        long entries
) {}
