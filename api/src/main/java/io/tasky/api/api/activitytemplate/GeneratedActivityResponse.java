package io.tasky.api.api.activitytemplate;

import java.time.Instant;
import java.util.UUID;

public record GeneratedActivityResponse(
        UUID id,
        UUID projectId,
        Instant startDatetime,
        Instant endDatetime
) {}
