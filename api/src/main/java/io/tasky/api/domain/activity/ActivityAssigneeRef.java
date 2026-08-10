package io.tasky.api.domain.activity;

import java.util.UUID;

public interface ActivityAssigneeRef {
    UUID getActivityId();
    UUID getMembershipId();
}
