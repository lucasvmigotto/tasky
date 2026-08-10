package io.tasky.api.api.project;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        UUID departmentId,
        String name,
        String description,
        String color,
        UUID managerMembershipId,
        BigDecimal hourlyRate,
        long estimatedSeconds,
        Long budgetSeconds,
        BigDecimal budgetAmount,
        boolean isActive,
        Instant createdAt
) {}
