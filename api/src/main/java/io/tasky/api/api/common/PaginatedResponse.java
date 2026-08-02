package io.tasky.api.api.common;

import java.util.List;

public record PaginatedResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int size,
        int number
) {}
