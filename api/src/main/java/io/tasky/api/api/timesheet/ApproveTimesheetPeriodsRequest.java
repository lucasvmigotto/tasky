package io.tasky.api.api.timesheet;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record ApproveTimesheetPeriodsRequest(
        @NotEmpty List<UUID> periodIds
) {}
