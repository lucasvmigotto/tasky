package io.tasky.api.api.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateActivityCommentRequest(
        @NotBlank @Size(max = 4000) String content,
        @Size(max = 20) List<@NotNull UUID> mentionMembershipIds
) {}
