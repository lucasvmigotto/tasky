package io.tasky.api.api.document;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateDocumentRequest(
        @Size(max = 255) String title,
        @Size(max = 200000) String contentMd,
        @Size(max = 255) String changelog
) {}
