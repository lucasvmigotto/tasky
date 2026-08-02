package io.tasky.api.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRequestCommentRequest(
        @NotBlank @Size(max = 5000) String content
) {}
