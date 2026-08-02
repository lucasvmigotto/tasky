package io.tasky.api.api.capacity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkScheduleResponse(
        UUID id,
        String name,
        String description,
        boolean isDefault,
        List<WorkScheduleDayResponse> days,
        Instant createdAt,
        Instant updatedAt
) {}
