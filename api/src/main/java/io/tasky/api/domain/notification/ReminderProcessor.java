package io.tasky.api.domain.notification;

import io.tasky.api.config.TaskYProperties;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReminderProcessor {
    private final ActivityRepository activityRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final NotificationService notificationService;
    private final TaskYProperties properties;

    @Transactional
    public int processActivitiesDueSoon(Instant now) {
        return notify(activityRepository.findDueSoonReminderCandidates(
                        now, now.plus(properties.reminders().dueSoonWindow()), properties.reminders().batchSize()),
                NotificationPreferenceType.ACTIVITY_DUE_SOON, "Atividade proxima do prazo", "activity");
    }

    @Transactional
    public int processOverdueActivities(Instant now) {
        return notify(activityRepository.findOverdueReminderCandidates(now, properties.reminders().batchSize()),
                NotificationPreferenceType.ACTIVITY_OVERDUE, "Atividade atrasada", "activity");
    }

    @Transactional
    public int processOpenTimers(Instant now) {
        return notify(timeEntryRepository.findOpenTimerReminderCandidates(
                        now.minus(properties.reminders().openTimerAge()), properties.reminders().batchSize()),
                NotificationPreferenceType.OPEN_TIMER, "Timer aberto ha muito tempo", "time_entry");
    }

    @Transactional
    public int processPendingApprovals(Instant now) {
        return notify(timeEntryRepository.findPendingApprovalReminderCandidates(
                        now.minus(properties.reminders().pendingApprovalAge()), properties.reminders().batchSize()),
                NotificationPreferenceType.TIME_ENTRY_PENDING_APPROVAL,
                "Apontamento aguardando aprovacao", "time_entry");
    }

    private int notify(List<ReminderCandidate> candidates, NotificationPreferenceType type,
                       String title, String resourceType) {
        int created = 0;
        for (ReminderCandidate candidate : candidates) {
            if (notificationService.createOnce(candidate.getOrganizationId(),
                    candidate.getRecipientMembershipId(), eventKey(type, candidate), type.name(), title,
                    candidate.getBody(), resourceType, candidate.getResourceId())) {
                created++;
            }
        }
        return created;
    }

    private String eventKey(NotificationPreferenceType type, ReminderCandidate candidate) {
        return "reminder:" + type.name() + ":" + candidate.getResourceId();
    }
}
