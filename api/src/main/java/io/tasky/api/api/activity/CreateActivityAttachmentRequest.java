package io.tasky.api.api.activity;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateActivityAttachmentRequest(
        @NotBlank String fileName,
        @NotBlank String contentType,
        @Min(0) long sizeBytes,
        @NotBlank String url
) {}
