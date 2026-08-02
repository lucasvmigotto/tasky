package io.tasky.api.api.search;

import java.util.UUID;

public record SearchResultResponse(
        String type,
        UUID id,
        String title,
        String subtitle,
        String url
) {}
