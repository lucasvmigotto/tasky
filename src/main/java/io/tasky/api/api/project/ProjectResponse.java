package io.tasky.api.api.project;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        UUID departmentId,
        String name,
        String description,
        UUID managerMembershipId,
        boolean isActive,
        Instant createdAt
) {}
