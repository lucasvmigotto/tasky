package io.tasky.api.domain.timeentry;

import java.util.UUID;

public interface TimeEntryTagRef {
    UUID getEntryId();
    String getTag();
}
