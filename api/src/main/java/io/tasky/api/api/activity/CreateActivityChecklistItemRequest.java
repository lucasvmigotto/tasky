package io.tasky.api.api.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateActivityChecklistItemRequest(
        @NotBlank @Size(max = 500) String title
) {}
