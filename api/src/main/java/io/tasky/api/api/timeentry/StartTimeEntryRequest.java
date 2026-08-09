package io.tasky.api.api.timeentry;

import java.util.UUID;

public record StartTimeEntryRequest(
        UUID projectId,
        UUID activityId,
        String description,
        String glpiTicketId,
        Boolean billable
) {}
