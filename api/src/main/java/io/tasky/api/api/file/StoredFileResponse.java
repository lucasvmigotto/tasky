package io.tasky.api.api.file;

import java.util.UUID;

public record StoredFileResponse(
        UUID id,
        String fileName,
        String contentType,
        long sizeBytes,
        String url
) {}
