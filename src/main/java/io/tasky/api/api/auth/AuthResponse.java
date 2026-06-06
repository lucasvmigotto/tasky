package io.tasky.api.api.auth;

import java.util.List;

public record AuthResponse(
        String token,
        UserInfo user,
        List<OrgInfo> organizations
) {
    public record UserInfo(
            String id,
            String email,
            String username,
            String displayName,
            String avatarUrl
    ) {}

    public record OrgInfo(
            String id,
            String name,
            String slug,
            String role
    ) {}
}
