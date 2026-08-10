package io.tasky.api.domain.sector;

import java.util.UUID;

public interface SectorMemberWorkload {
    UUID getMembershipId();
    long getOpenActivities();
    long getEstimatedSeconds();
}
