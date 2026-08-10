package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.InvitationStatus;
import io.tasky.api.domain.membership.Role;

import java.time.Instant;
import java.util.UUID;

public record MembershipInvitationResponse(
        UUID id,
        String email,
        Role role,
        UUID primaryDepartmentId,
        InvitationStatus status,
        Instant invitedAt,
        Instant expiresAt,
        Instant acceptedAt,
        Instant revokedAt
) {}
