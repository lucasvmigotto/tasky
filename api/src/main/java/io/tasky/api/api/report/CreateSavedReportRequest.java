package io.tasky.api.api.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record CreateSavedReportRequest(
        @NotBlank(message = "Report name is required")
        @Size(max = 150, message = "Report name must be at most 150 characters")
        String name,
        String description,
        Map<String, Object> params
) {}
