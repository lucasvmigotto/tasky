package io.tasky.api.api.department;

import java.time.Instant;
import java.util.UUID;

public record DepartmentResponse(
        UUID id,
        UUID organizationId,
        String name,
        Instant createdAt
) {}
