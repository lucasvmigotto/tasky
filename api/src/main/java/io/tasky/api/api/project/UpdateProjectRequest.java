package io.tasky.api.api.project;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateProjectRequest(
        String name,
        String description,
        UUID managerMembershipId,
        UUID clientId,
        BigDecimal hourlyRate,
        Long estimatedSeconds,
        Long budgetSeconds,
        BigDecimal budgetAmount,
        Boolean isActive
) {}
