package io.tasky.api.api.capacity;

import java.time.LocalTime;
import java.util.UUID;

public record WorkScheduleDayResponse(
        UUID id,
        short dayOfWeek,
        boolean isWorkDay,
        LocalTime startTime,
        LocalTime endTime
) {}
