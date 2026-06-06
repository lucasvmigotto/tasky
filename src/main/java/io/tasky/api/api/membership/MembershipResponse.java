package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;

import java.time.Instant;
import java.util.UUID;

public record MembershipResponse(
        UUID id,
        UUID userId,
        String email,
        String username,
        Role role,
        String customUsername,
        int maxDailyWorkMinutes,
        Instant createdAt
) {}
