package io.tasky.api.api.project;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        String color,
        UUID managerMembershipId,
        BigDecimal hourlyRate,
        Long estimatedSeconds,
        Long budgetSeconds,
        BigDecimal budgetAmount
) {}
