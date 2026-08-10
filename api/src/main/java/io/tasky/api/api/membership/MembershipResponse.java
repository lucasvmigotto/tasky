package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.Role;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MembershipResponse(
        UUID id,
        UUID userId,
        String email,
        String username,
        Role role,
        String customUsername,
        int maxDailyWorkMinutes,
        UUID primaryDepartmentId,
        List<MemberTypeRef> memberTypes,
        String timezone,
        Instant createdAt
) {
    public record MemberTypeRef(UUID id, String name) {}
}
