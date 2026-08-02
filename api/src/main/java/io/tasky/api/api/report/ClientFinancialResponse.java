package io.tasky.api.api.report;

import java.math.BigDecimal;
import java.util.UUID;

public record ClientFinancialResponse(
        UUID clientId,
        String clientName,
        long estimatedSeconds,
        long actualApprovedSeconds,
        long actualNotApprovedSeconds,
        long remainingSeconds,
        double progressPercent,
        BigDecimal cost,
        BigDecimal revenue,
        BigDecimal margin
) {}
