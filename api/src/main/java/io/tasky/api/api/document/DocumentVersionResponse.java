package io.tasky.api.api.document;

import java.time.Instant;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id,
        int versionNo,
        String contentMd,
        String changelog,
        UUID createdByMembershipId,
        Instant createdAt
) {}
