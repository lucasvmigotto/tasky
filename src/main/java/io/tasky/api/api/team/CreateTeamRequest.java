package io.tasky.api.api.team;

import jakarta.validation.constraints.NotBlank;

public record CreateTeamRequest(
        @NotBlank String name
) {}
