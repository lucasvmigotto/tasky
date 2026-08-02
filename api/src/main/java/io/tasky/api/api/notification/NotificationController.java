package io.tasky.api.api.notification;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.notification.Notification;
import io.tasky.api.domain.notification.NotificationPreferenceService;
import io.tasky.api.domain.notification.NotificationPreferenceType;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final NotificationPreferenceService preferenceService;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(@AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        return ResponseEntity.ok(notificationService.list(membership.getId()).stream().map(this::toResponse).toList());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<java.util.Map<String, Long>> unread(@AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        return ResponseEntity.ok(java.util.Map.of("count", notificationService.unread(membership.getId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> read(@PathVariable UUID id, @AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        return ResponseEntity.ok(toResponse(notificationService.markRead(membership.getId(), id)));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> readAll(@AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        notificationService.markAllRead(membership.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreferencesResponse> preferences(
            @AuthenticationPrincipal SecurityUser user) {
        return ResponseEntity.ok(toPreferencesResponse(
                preferenceService.get(currentMembership(user).getId())));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreferencesResponse> updatePreferences(
            @Valid @RequestBody NotificationPreferencesRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        EnumMap<NotificationPreferenceType, Boolean> preferences =
                new EnumMap<>(NotificationPreferenceType.class);
        for (NotificationPreferenceValue preference : request.preferences()) {
            if (preferences.put(preference.type(), preference.enabled()) != null) {
                throw new IllegalArgumentException("Notification preference types must be unique");
            }
        }
        return ResponseEntity.ok(toPreferencesResponse(
                preferenceService.replace(currentMembership(user).getId(), preferences)));
    }

    private OrganizationMembership currentMembership(SecurityUser user) {
        return permissionService.getMembership(user.id(), user.activeOrganizationId()).orElseThrow(() -> new SecurityException("Not a member"));
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getResourceType(), n.getResourceId(), n.getReadAt(), n.getCreatedAt());
    }

    private NotificationPreferencesResponse toPreferencesResponse(
            Map<NotificationPreferenceType, Boolean> preferences) {
        return new NotificationPreferencesResponse(preferences.entrySet().stream()
                .map(entry -> new NotificationPreferenceValue(entry.getKey(), entry.getValue()))
                .toList());
    }
}
