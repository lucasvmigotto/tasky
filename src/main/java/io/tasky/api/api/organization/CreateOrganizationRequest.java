package io.tasky.api.api.organization;

import jakarta.validation.constraints.NotBlank;

public record CreateOrganizationRequest(
        @NotBlank String name,
        @NotBlank String slug
) {}
