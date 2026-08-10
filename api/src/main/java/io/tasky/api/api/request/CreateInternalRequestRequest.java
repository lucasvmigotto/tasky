package io.tasky.api.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateInternalRequestRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 5000) String description,
        @Size(max = 64) String glpiTicketId,
        String priority,
        UUID requestingDepartmentId,
        UUID responsibleDepartmentId,
        Instant desiredDueDate,
        List<UUID> assigneeMembershipIds
) {}
