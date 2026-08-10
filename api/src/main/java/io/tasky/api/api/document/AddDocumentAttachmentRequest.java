package io.tasky.api.api.document;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddDocumentAttachmentRequest(
        @NotNull UUID storedFileId
) {}
