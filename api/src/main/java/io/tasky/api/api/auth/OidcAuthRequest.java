package io.tasky.api.api.auth;

import io.tasky.api.security.OidcProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OidcAuthRequest(
        @NotNull OidcProvider provider,
        @NotBlank String idToken
) {}
