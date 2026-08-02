package io.tasky.api.domain.sector;

import io.tasky.api.domain.activity.ActivityStatus;

public interface SectorActivityStatusCount {
    ActivityStatus getStatus();
    long getTotal();
}
