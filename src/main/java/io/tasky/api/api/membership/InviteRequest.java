package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record InviteRequest(
        @Email String email,
        @NotNull Role role,
        List<UUID> departmentIds,
        List<UUID> teamIds
) {}
