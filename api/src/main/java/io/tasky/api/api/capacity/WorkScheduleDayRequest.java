package io.tasky.api.api.capacity;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.LocalTime;

public record WorkScheduleDayRequest(
        @Min(1) @Max(7) short dayOfWeek,
        Boolean isWorkDay,
        LocalTime startTime,
        LocalTime endTime
) {}
