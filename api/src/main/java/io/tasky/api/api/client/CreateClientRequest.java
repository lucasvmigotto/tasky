package io.tasky.api.api.client;

import jakarta.validation.constraints.NotBlank;

public record CreateClientRequest(
        @NotBlank String name
) {}
