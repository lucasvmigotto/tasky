package io.tasky.api.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByRecipientMembershipIdOrderByCreatedAtDesc(UUID recipientMembershipId);
    long countByRecipientMembershipIdAndReadAtIsNull(UUID recipientMembershipId);
    Optional<Notification> findByIdAndRecipientMembershipId(UUID id, UUID recipientMembershipId);

    @Modifying
    @Query(value = """
            INSERT INTO notifications
                (organization_id, recipient_membership_id, type, title, body, resource_type, resource_id, event_key)
            VALUES
                (:orgId, :recipientId, :type, :title, :body, :resourceType, :resourceId, :eventKey)
            ON CONFLICT (organization_id, recipient_membership_id, event_key)
                WHERE event_key IS NOT NULL DO NOTHING
            """, nativeQuery = true)
    int insertOnce(@Param("orgId") UUID orgId,
                   @Param("recipientId") UUID recipientId,
                   @Param("type") String type,
                   @Param("title") String title,
                   @Param("body") String body,
                   @Param("resourceType") String resourceType,
                   @Param("resourceId") UUID resourceId,
                   @Param("eventKey") String eventKey);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :readAt WHERE n.recipientMembershipId = :membershipId AND n.readAt IS NULL")
    int markAllRead(@Param("membershipId") UUID membershipId, @Param("readAt") Instant readAt);
}
