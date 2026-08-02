package io.tasky.api.api.auth;

public record SwitchOrgResponse(
        String token,
        AuthResponse.OrgInfo org
) {}
