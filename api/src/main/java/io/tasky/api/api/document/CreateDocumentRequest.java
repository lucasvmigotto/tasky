package io.tasky.api.api.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateDocumentRequest(
        UUID projectId,
        UUID requestId,
        UUID activityId,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 200000) String contentMd
) {}
