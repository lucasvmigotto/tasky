package io.tasky.api.api.request;

import java.time.Instant;
import java.util.UUID;

public record InternalRequestResponse(
        UUID id,
        UUID organizationId,
        String requestKey,
        String title,
        String description,
        String priority,
        String status,
        UUID requesterMembershipId,
        UUID requestingDepartmentId,
        UUID responsibleDepartmentId,
        UUID assigneeMembershipId,
        Instant desiredDueDate,
        UUID projectId,
        UUID activityId,
        Instant completedAt,
        Instant canceledAt,
        Instant createdAt,
        Instant updatedAt
) {}
