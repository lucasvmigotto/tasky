package io.tasky.api.api.document;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID organizationId,
        UUID projectId,
        UUID requestId,
        UUID activityId,
        String title,
        String slug,
        String contentMd,
        String status,
        UUID authorMembershipId,
        String authorName,
        int version,
        int attachmentCount,
        Instant createdAt,
        Instant updatedAt
) {}
