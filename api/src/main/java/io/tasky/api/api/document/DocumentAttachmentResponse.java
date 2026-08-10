package io.tasky.api.api.document;

import java.time.Instant;
import java.util.UUID;

public record DocumentAttachmentResponse(
        UUID id,
        String fileName,
        String contentType,
        long sizeBytes,
        String url,
        UUID uploadedByMembershipId,
        Instant createdAt
) {}
