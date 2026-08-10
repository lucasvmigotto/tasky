package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record ChangeRoleRequest(
        @NotNull Role role,
        UUID departmentId,
        List<UUID> memberTypeIds
) {
    public ChangeRoleRequest(Role role, UUID departmentId) {
        this(role, departmentId, null);
    }
}
