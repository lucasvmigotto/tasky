package io.tasky.api.api.activitytemplate;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record UseActivityTemplateRequest(@NotNull Instant occurrenceAt) {}
