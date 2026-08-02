package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ChangeRoleRequest(
        @NotNull Role role,
        UUID departmentId,
        UUID teamId
) {}
