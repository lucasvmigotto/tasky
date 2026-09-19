package io.tasky.api.domain.activity;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * PHASE 3 (T-15): shared activity event/notification helpers used by the
 * core and collaboration services. Joins the caller's transaction.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ActivityEventHelper {

    private final ActivityEventRepository activityEventRepository;
    private final NotificationService notificationService;

    public void notifyAssignee(Activity activity, String eventKey, String type, String title, String body) {
        notificationService.createOnce(activity.getProject().getDepartment().getOrganization().getId(),
                activity.getAssignedTo().getId(), eventKey, type, title, body, "activity", activity.getId());
    }

    public String statusLabel(ActivityStatus status) {
        return switch (status) {
            case TODO -> "A fazer";
            case IN_PROGRESS -> "Em andamento";
            case IN_TESTING -> "Em testes";
            case DONE -> "Concluida";
            case BLOCKED -> "Bloqueada";
            case CANCELED -> "Cancelada";
        };
    }

    public void appendEvent(UUID orgId, Activity activity, OrganizationMembership actor, ActivityEventType type,
                             String oldValue, String newValue, ActivityComment comment) {
        activityEventRepository.save(ActivityEvent.builder()
                .organizationId(orgId)
                .activity(activity)
                .actor(actor)
                .comment(comment)
                .eventType(type)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }

    public String instantValue(Instant value) {
        return value != null ? value.toString() : null;
    }
}
