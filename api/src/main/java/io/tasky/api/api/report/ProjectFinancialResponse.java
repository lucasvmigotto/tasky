package io.tasky.api.api.report;

import java.math.BigDecimal;
import java.util.UUID;

public record ProjectFinancialResponse(
        UUID projectId,
        String projectName,
        long estimatedSeconds,
        long actualApprovedSeconds,
        long actualNotApprovedSeconds,
        long remainingSeconds,
        double progressPercent,
        Long budgetSeconds,
        BigDecimal budgetAmount,
        BigDecimal cost,
        BigDecimal revenue,
        BigDecimal margin
) {}
