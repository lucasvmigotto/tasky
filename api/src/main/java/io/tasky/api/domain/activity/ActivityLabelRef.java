package io.tasky.api.domain.activity;

import java.util.UUID;

public interface ActivityLabelRef {
    UUID getActivityId();
    UUID getLabelId();
}
