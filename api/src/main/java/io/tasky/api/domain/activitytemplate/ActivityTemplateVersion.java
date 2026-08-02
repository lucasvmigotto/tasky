package io.tasky.api.domain.activitytemplate;

import io.tasky.api.domain.membership.OrganizationMembership;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_template_versions")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ActivityTemplateVersion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private ActivityTemplate template;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private short weight;

    @Column(name = "duration_seconds", nullable = false)
    private long durationSeconds;

    @Column(name = "estimated_seconds", nullable = false)
    private long estimatedSeconds;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assigned_to", nullable = false)
    private OrganizationMembership assignedTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
