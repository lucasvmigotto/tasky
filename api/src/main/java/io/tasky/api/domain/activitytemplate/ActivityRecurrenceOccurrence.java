package io.tasky.api.domain.activitytemplate;

import io.tasky.api.domain.activity.Activity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activity_recurrence_occurrences")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ActivityRecurrenceOccurrence {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recurrence_id", nullable = false)
    private ActivityRecurrence recurrence;

    @Column(name = "scheduled_for", nullable = false)
    private Instant scheduledFor;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
