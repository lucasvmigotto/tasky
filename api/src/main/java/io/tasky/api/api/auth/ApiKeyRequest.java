package io.tasky.api.api.auth;

import jakarta.validation.constraints.NotBlank;

public record ApiKeyRequest(
        @NotBlank String apiKey
) {}
