package io.tasky.api.api.timesheet;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateTimesheetPeriodRequest(
        @NotNull Instant periodStart
) {}
