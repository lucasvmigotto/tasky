package io.tasky.api.api.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(
        UUID id,
        UUID organizationId,
        UUID actorUserId,
        UUID actorMembershipId,
        String resourceType,
        UUID resourceId,
        String action,
        String beforeData,
        String afterData,
        String requestId,
        Instant createdAt
) {}
