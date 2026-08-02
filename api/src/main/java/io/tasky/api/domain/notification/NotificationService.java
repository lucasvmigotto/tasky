package io.tasky.api.domain.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {
    private final NotificationRepository repository;

    public boolean createOnce(UUID orgId, UUID recipientMembershipId, String eventKey, String type,
                              String title, String body, String resourceType, UUID resourceId) {
        if (eventKey == null || eventKey.isBlank() || eventKey.length() > 255) {
            throw new IllegalArgumentException("Notification event key is invalid");
        }
        return repository.insertOnce(orgId, recipientMembershipId, type, title, body,
                resourceType, resourceId, eventKey) == 1;
    }

    @Transactional(readOnly = true)
    public List<Notification> list(UUID membershipId) { return repository.findTop50ByRecipientMembershipIdOrderByCreatedAtDesc(membershipId); }

    @Transactional(readOnly = true)
    public long unread(UUID membershipId) { return repository.countByRecipientMembershipIdAndReadAtIsNull(membershipId); }

    public Notification markRead(UUID membershipId, UUID id) {
        Notification notification = repository.findByIdAndRecipientMembershipId(id, membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (notification.getReadAt() == null) notification.setReadAt(Instant.now());
        return repository.save(notification);
    }

    public int markAllRead(UUID membershipId) {
        return repository.markAllRead(membershipId, Instant.now());
    }
}
