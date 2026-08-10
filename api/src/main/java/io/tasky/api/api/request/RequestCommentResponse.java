package io.tasky.api.api.request;

import java.time.Instant;
import java.util.UUID;

public record RequestCommentResponse(
        UUID id,
        UUID requestId,
        UUID authorMembershipId,
        String content,
        Instant createdAt
) {}
