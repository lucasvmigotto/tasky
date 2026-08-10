package io.tasky.api.api.activity;

import java.time.Instant;
import java.util.UUID;

public record ActivityAttachmentResponse(
        UUID id,
        UUID activityId,
        UUID uploadedByMembershipId,
        String uploadedByName,
        String fileName,
        String contentType,
        long sizeBytes,
        String url,
        Instant createdAt
) {}
