package io.tasky.api.api.request;

import jakarta.validation.constraints.Size;

public record ConvertRequestToProjectRequest(
        @Size(max = 255) String name,
        @Size(max = 5000) String description
) {}
