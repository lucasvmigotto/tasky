package io.tasky.api.domain.notification;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class ReminderScheduler {
    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final ReminderProcessor processor;

    @Scheduled(fixedDelayString = "${tasky.reminders.fixed-delay-ms:60000}")
    public void processReminders() {
        Instant now = Instant.now();
        run("activity due soon", () -> processor.processActivitiesDueSoon(now));
        run("activity overdue", () -> processor.processOverdueActivities(now));
        run("open timer", () -> processor.processOpenTimers(now));
        run("time entry pending approval", () -> processor.processPendingApprovals(now));
    }

    private void run(String reminder, ReminderOperation operation) {
        try {
            int created = operation.process();
            if (created > 0) {
                log.info("Created {} {} reminders", created, reminder);
            }
        } catch (RuntimeException ex) {
            log.error("Reminder processing failed type={}", reminder, ex);
        }
    }

    @FunctionalInterface
    private interface ReminderOperation {
        int process();
    }
}
