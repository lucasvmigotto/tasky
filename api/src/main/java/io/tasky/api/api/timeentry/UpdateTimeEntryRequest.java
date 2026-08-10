package io.tasky.api.api.timeentry;

import java.time.Instant;
import java.util.UUID;

public record UpdateTimeEntryRequest(
        UUID projectId,
        UUID activityId,
        String description,
        String glpiTicketId,
        Instant startTime,
        Instant endTime,
        Boolean billable
) {}
