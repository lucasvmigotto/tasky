package io.tasky.api.api.activitytemplate;

import io.tasky.api.domain.activitytemplate.RecurrenceFrequency;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record RecurrenceRequest(
        @NotNull RecurrenceFrequency frequency,
        @Min(1) int interval,
        @NotBlank String timezone,
        @NotNull Instant nextOccurrence
) {}
