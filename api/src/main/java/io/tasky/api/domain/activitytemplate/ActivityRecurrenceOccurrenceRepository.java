package io.tasky.api.domain.activitytemplate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface ActivityRecurrenceOccurrenceRepository extends JpaRepository<ActivityRecurrenceOccurrence, UUID> {
    boolean existsByRecurrenceIdAndScheduledFor(UUID recurrenceId, Instant scheduledFor);
}
