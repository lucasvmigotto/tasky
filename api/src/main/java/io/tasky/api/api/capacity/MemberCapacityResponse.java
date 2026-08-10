package io.tasky.api.api.capacity;

import java.time.Instant;
import java.util.UUID;

public record MemberCapacityResponse(
        UUID membershipId,
        String displayName,
        Instant from,
        Instant to,
        long availableSeconds,
        long plannedSeconds,
        long actualSeconds,
        long remainingCapacitySeconds,
        double utilization,
        long overloadSeconds
) {}
