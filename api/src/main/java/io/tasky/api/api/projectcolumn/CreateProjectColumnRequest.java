package io.tasky.api.api.projectcolumn;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProjectColumnRequest(
        @NotBlank String name,
        String color,
        @NotNull String lifecycleStatus
) {}
