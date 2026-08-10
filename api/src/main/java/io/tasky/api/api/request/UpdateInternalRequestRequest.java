package io.tasky.api.api.request;

import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UpdateInternalRequestRequest(
        @Size(max = 255) String title,
        @Size(max = 5000) String description,
        @Size(max = 64) String glpiTicketId,
        String priority,
        UUID responsibleDepartmentId,
        UUID assigneeMembershipId,
        List<UUID> assigneeMembershipIds,
        Instant desiredDueDate
) {}
