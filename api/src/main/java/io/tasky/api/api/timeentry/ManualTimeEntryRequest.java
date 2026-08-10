package io.tasky.api.api.timeentry;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record ManualTimeEntryRequest(
        @NotNull(message = "startTime is required") Instant startTime,
        @NotNull(message = "endTime is required") Instant endTime,
        UUID projectId,
        UUID activityId,
        String description,
        String glpiTicketId,
        Boolean billable
) {}
