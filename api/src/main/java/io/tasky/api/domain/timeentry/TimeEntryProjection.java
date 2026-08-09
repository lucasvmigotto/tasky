package io.tasky.api.domain.timeentry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public interface TimeEntryProjection {
    UUID getId();
    UUID getOrganizationId();
    UUID getMembershipId();
    UUID getUserId();
    UUID getProjectId();
    UUID getActivityId();
    String getDescription();
    String getGlpiTicketId();
    Instant getStartTime();
    Instant getEndTime();
    Long getDurationSeconds();
    long getPausedSeconds();
    Instant getPausedAt();
    String getApprovalStatus();
    Instant getSubmittedAt();
    Instant getApprovedAt();
    UUID getApprovedBy();
    String getRejectionComment();
    BigDecimal getBillingRateSnapshot();
    BigDecimal getCostRateSnapshot();
    Boolean getBillable();
    Instant getCreatedAt();
}
