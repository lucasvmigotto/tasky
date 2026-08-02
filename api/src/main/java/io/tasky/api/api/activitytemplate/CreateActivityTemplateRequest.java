package io.tasky.api.api.activitytemplate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateActivityTemplateRequest(
        UUID templateId,
        @NotBlank String name,
        @Valid RecurrenceRequest recurrence
) {}
