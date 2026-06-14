package io.tasky.api.api.project;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateProjectRequest(
        @NotBlank String name,
        String description,
        @NotBlank UUID managerMembershipId
) {}
