package io.tasky.api.api.timeentry;

import java.util.List;
import java.util.UUID;

public record StartTimeEntryRequest(
        UUID projectId,
        UUID activityId,
        String description,
        Boolean billable,
        List<String> tags
) {}
