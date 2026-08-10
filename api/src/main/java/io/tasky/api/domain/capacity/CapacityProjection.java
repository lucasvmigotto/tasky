package io.tasky.api.domain.capacity;

import java.util.UUID;

public interface CapacityProjection {

    interface Available {
        UUID getMembershipId();
        long getAvailableSeconds();
    }

    interface Planned {
        UUID getMembershipId();
        long getPlannedSeconds();
    }

    interface Actual {
        UUID getMembershipId();
        long getActualSeconds();
    }
}
