package io.tasky.api.api.request;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InternalRequestResponse(
        UUID id,
        UUID organizationId,
        String requestKey,
        String glpiTicketId,
        String title,
        String description,
        String priority,
        String status,
        UUID requesterMembershipId,
        UUID requestingDepartmentId,
        UUID responsibleDepartmentId,
        UUID assigneeMembershipId,
        List<UUID> assigneeMembershipIds,
        Instant desiredDueDate,
        UUID projectId,
        UUID activityId,
        Instant completedAt,
        Instant canceledAt,
        Instant createdAt,
        Instant updatedAt
) {}