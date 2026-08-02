package io.tasky.api.api.activitytemplate;

import io.tasky.api.domain.activitytemplate.RecurrenceFrequency;

import java.time.Instant;
import java.util.UUID;

public record ActivityTemplateResponse(
        UUID id,
        UUID projectId,
        String name,
        int version,
        String title,
        String description,
        short weight,
        long durationSeconds,
        long estimatedSeconds,
        UUID assignedToMembershipId,
        RecurrenceResponse recurrence,
        Instant createdAt
) {
    public record RecurrenceResponse(
            UUID id,
            RecurrenceFrequency frequency,
            int interval,
            String timezone,
            Instant nextOccurrence,
            boolean active
    ) {}
}
