package io.tasky.api.api.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(UUID id, String type, String title, String body, String resourceType, UUID resourceId, Instant readAt, Instant createdAt) {}
