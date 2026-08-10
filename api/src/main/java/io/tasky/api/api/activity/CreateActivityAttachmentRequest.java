package io.tasky.api.api.activity;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateActivityAttachmentRequest(
        @NotBlank String fileName,
        @NotBlank String contentType,
        @Min(0) long sizeBytes,
        String url,
        UUID storedFileId
) {}
