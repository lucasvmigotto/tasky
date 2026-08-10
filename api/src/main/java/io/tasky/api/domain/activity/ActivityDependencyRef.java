package io.tasky.api.domain.activity;

import java.util.UUID;

public interface ActivityDependencyRef {
    UUID getChildActivityId();
    UUID getParentActivityId();
}
