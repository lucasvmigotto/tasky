package io.tasky.api.api.notification;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record NotificationPreferencesRequest(
        @NotNull List<@Valid NotificationPreferenceValue> preferences
) {}
