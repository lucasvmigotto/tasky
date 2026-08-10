package io.tasky.api.api.capacity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MembershipWorkScheduleResponse(
        UUID id,
        UUID membershipId,
        UUID scheduleId,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        Instant createdAt
) {}
