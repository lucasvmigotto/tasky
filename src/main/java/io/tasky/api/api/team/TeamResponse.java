package io.tasky.api.api.team;

import java.time.Instant;
import java.util.UUID;

public record TeamResponse(
        UUID id,
        UUID departmentId,
        String name,
        Instant createdAt
) {}
