package io.tasky.api.api.notification;

import io.tasky.api.domain.notification.NotificationPreferenceType;
import jakarta.validation.constraints.NotNull;

public record NotificationPreferenceValue(
        @NotNull NotificationPreferenceType type,
        @NotNull Boolean enabled
) {}
