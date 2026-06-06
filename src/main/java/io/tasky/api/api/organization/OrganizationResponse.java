package io.tasky.api.api.organization;

import java.time.Instant;

public record OrganizationResponse(
        String id,
        String name,
        String slug,
        Instant createdAt
) {}
