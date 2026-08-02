package io.tasky.api.api.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        @NotNull UUID managerMembershipId,
        UUID clientId,
        BigDecimal hourlyRate,
        Long estimatedSeconds,
        Long budgetSeconds,
        BigDecimal budgetAmount
) {}
