package io.tasky.api.domain.activitytemplate;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActivityRecurrenceProcessor {
    private static final Logger log = LoggerFactory.getLogger(ActivityRecurrenceProcessor.class);

    private final ActivityRecurrenceRepository recurrenceRepository;
    private final ActivityRecurrenceOccurrenceRepository occurrenceRepository;
    private final ActivityTemplateService templateService;

    @Transactional
    public void process(UUID recurrenceId, Instant now) {
        ActivityRecurrence recurrence = recurrenceRepository.findByIdForUpdate(recurrenceId).orElse(null);
        if (recurrence == null || !recurrence.isActive() || recurrence.getNextOccurrence().isAfter(now)) {
            return;
        }

        Instant scheduledFor = recurrence.getNextOccurrence();
        if (!occurrenceRepository.existsByRecurrenceIdAndScheduledFor(recurrenceId, scheduledFor)) {
            try {
                var version = recurrence.getTemplateVersion();
                var activity = templateService.instantiate(
                        recurrence.getProject(), version, scheduledFor, version.getTemplate().getCreatedBy());
                occurrenceRepository.save(ActivityRecurrenceOccurrence.builder()
                        .recurrence(recurrence)
                        .scheduledFor(scheduledFor)
                        .activity(activity)
                        .build());
                log.info("Generated recurring activity recurrenceId={} scheduledFor={} activityId={}",
                        recurrenceId, scheduledFor, activity.getId());
            } catch (IllegalArgumentException | IllegalStateException ex) {
                recurrence.setActive(false);
                log.error("Disabled invalid activity recurrence recurrenceId={}: {}", recurrenceId, ex.getMessage());
                return;
            }
        }

        recurrence.setNextOccurrence(RecurrenceSchedule.next(scheduledFor, recurrence.getFrequency(),
                recurrence.getInterval(), recurrence.getTimezone()));
        recurrenceRepository.save(recurrence);
    }
}
