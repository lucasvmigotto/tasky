package io.tasky.api.api.capacity;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record AssignWorkScheduleRequest(
        @NotNull UUID scheduleId,
        @NotNull LocalDate effectiveFrom,
        LocalDate effectiveTo
) {}
