package io.tasky.api.api.report;

import java.util.UUID;

public record WorkloadMemberResponse(
        UUID membershipId,
        String name,
        long capacitySeconds,
        long estimatedSeconds,
        long actualSeconds,
        double utilizationPercent
) {}
