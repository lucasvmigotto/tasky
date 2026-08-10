package io.tasky.api.api.capacity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateOrganizationHolidayRequest(
        @NotBlank String name,
        @NotNull LocalDate holidayDate,
        Boolean isRecurringYearly
) {}
