package io.tasky.api.api.activity;

import java.util.UUID;

public record ActivityMentionResponse(
        UUID membershipId,
        String displayName,
        String avatarUrl
) {}
