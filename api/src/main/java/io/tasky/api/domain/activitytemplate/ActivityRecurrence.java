package io.tasky.api.domain.activitytemplate;

import io.tasky.api.domain.project.Project;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_recurrences")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ActivityRecurrence {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_version_id", nullable = false)
    private ActivityTemplateVersion templateVersion;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RecurrenceFrequency frequency;

    @Column(name = "recurrence_interval", nullable = false)
    private int interval;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Column(name = "next_occurrence", nullable = false)
    private Instant nextOccurrence;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
