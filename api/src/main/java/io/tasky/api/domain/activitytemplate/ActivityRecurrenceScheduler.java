package io.tasky.api.domain.activitytemplate;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class ActivityRecurrenceScheduler {
    private static final Logger log = LoggerFactory.getLogger(ActivityRecurrenceScheduler.class);

    private final ActivityRecurrenceRepository recurrenceRepository;
    private final ActivityRecurrenceProcessor processor;

    @Scheduled(fixedDelayString = "${tasky.recurrence.fixed-delay-ms:60000}")
    public void generateDueActivities() {
        Instant now = Instant.now();
        for (var recurrenceId : recurrenceRepository.findDueIds(now)) {
            try {
                processor.process(recurrenceId, now);
            } catch (RuntimeException ex) {
                log.error("Recurring activity generation failed recurrenceId={}", recurrenceId, ex);
            }
        }
    }
}
