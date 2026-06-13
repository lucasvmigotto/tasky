package io.tasky.api.api.activity;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddDependencyRequest(
        @NotNull UUID parentActivityId
) {}
