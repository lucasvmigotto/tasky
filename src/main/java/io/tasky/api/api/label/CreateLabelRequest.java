package io.tasky.api.api.label;

import jakarta.validation.constraints.NotBlank;

public record CreateLabelRequest(
        @NotBlank String slug,
        @NotBlank String displayName
) {}
