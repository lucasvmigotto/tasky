package io.tasky.api.api.auth;

import java.util.List;

public record RefreshResponse(
        String token,
        AuthResponse.UserInfo user,
        List<AuthResponse.OrgInfo> organizations,
        String activeOrganizationId
) {}
