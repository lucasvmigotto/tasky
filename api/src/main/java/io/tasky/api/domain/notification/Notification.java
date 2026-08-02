package io.tasky.api.domain.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "recipient_membership_id", nullable = false)
    private UUID recipientMembershipId;
    @Column(nullable = false, length = 80)
    private String type;
    @Column(nullable = false)
    private String title;
    @Column(columnDefinition = "TEXT")
    private String body;
    @Column(name = "resource_type", length = 80)
    private String resourceType;
    @Column(name = "resource_id")
    private UUID resourceId;
    @Column(name = "event_key", length = 255)
    private String eventKey;
    @Column(name = "read_at")
    private Instant readAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @PrePersist protected void onCreate() { createdAt = Instant.now(); }
}
