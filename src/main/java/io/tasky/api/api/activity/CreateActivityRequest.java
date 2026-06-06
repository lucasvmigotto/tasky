package io.tasky.api.api.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateActivityRequest(
        @NotBlank String title,
        String description,
        short weight,
        @NotNull Instant startDatetime,
        @NotNull Instant endDatetime,
        @NotNull UUID assignedToMembershipId,
        List<UUID> labelIds,
        List<UUID> parentActivityIds
) {}
