package io.tasky.api.api.timeentry;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UpdateTimeEntryRequest(
        UUID projectId,
        UUID activityId,
        String description,
        Instant startTime,
        Instant endTime,
        Boolean billable,
        List<String> tags
) {}
