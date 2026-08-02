package io.tasky.api.domain.notification;

import java.util.UUID;

public interface ReminderCandidate {
    UUID getOrganizationId();
    UUID getRecipientMembershipId();
    UUID getResourceId();
    String getBody();
}
