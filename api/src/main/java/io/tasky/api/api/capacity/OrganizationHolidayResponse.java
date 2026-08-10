package io.tasky.api.api.capacity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OrganizationHolidayResponse(
        UUID id,
        String name,
        LocalDate holidayDate,
        boolean isRecurringYearly,
        Instant createdAt
) {}
