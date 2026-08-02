package io.tasky.api.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record CreateInternalRequestRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 5000) String description,
        String priority,
        UUID requestingDepartmentId,
        UUID responsibleDepartmentId,
        UUID responsibleTeamId,
        Instant desiredDueDate
) {}
