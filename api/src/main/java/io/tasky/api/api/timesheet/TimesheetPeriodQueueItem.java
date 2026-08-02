package io.tasky.api.api.timesheet;

import java.time.Instant;
import java.util.UUID;

public interface TimesheetPeriodQueueItem {
    UUID getId();
    UUID getOrganizationId();
    UUID getMembershipId();
    String getOwnerUsername();
    String getOwnerDisplayName();
    Instant getPeriodStart();
    Instant getPeriodEnd();
    Instant getSubmittedAt();
    long getVersion();
    long getTotalSeconds();
    long getBillableSeconds();
    long getEntryCount();
}
