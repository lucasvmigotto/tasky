package io.tasky.api.domain.activity;

import java.util.UUID;

public interface ActivityChecklistCount {
    UUID getActivityId();

    long getTotal();

    long getCompleted();
}
