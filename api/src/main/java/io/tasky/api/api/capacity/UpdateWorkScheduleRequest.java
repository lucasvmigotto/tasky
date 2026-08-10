package io.tasky.api.api.capacity;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdateWorkScheduleRequest(
        @NotBlank String name,
        String description,
        Boolean isDefault,
        List<WorkScheduleDayRequest> days
) {}
