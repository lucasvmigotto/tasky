package io.tasky.api.api.auth;

public record ApiKeyResponse(
        String token,
        String expiresAt
) {}
