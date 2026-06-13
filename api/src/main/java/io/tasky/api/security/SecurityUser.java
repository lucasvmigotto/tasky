package io.tasky.api.security;

import io.tasky.api.domain.membership.Role;
import lombok.Builder;

import java.util.UUID;

@Builder
public record SecurityUser(
        UUID id,
        String email,
        String username,
        UUID activeOrganizationId,
        Role role
) {}
