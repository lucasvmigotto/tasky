package io.tasky.api.api.client;

import java.time.Instant;
import java.util.UUID;

public record ClientResponse(
        UUID id,
        UUID organizationId,
        String name,
        Instant createdAt
) {}
