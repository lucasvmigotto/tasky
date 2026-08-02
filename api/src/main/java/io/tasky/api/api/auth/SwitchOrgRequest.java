package io.tasky.api.api.auth;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SwitchOrgRequest(
        @NotNull UUID orgId
) {}
