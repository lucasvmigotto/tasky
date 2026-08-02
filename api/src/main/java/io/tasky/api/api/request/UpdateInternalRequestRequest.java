package io.tasky.api.api.request;

import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record UpdateInternalRequestRequest(
        @Size(max = 255) String title,
        @Size(max = 5000) String description,
        String priority,
        UUID responsibleDepartmentId,
        UUID responsibleTeamId,
        UUID assigneeMembershipId,
        Instant desiredDueDate
) {}
