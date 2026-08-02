package io.tasky.api.api.label;

public record UpdateLabelRequest(
        String slug,
        String displayName
) {}
