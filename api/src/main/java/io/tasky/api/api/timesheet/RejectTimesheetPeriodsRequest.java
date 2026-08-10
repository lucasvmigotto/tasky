package io.tasky.api.api.timesheet;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record RejectTimesheetPeriodsRequest(
        @NotEmpty List<UUID> periodIds,
        @NotBlank String comment
) {}
