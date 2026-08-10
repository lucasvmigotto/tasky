package io.tasky.api.api.project;

import java.time.Instant;
import java.util.UUID;

public record ProjectAssignmentResponse(
        UUID id,
        UUID projectId,
        UUID membershipId,
        Instant assignedAt
) {}
