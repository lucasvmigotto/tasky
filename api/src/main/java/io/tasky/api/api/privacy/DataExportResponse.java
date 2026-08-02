package io.tasky.api.api.privacy;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DataExportResponse(String status, Instant createdAt, Instant expiresAt, ExportData data) {
    public record ExportData(UserData user, List<MembershipData> memberships, List<TimeEntryData> timeEntries) {}
    public record UserData(UUID id, String email, String username) {}
    public record MembershipData(UUID id, UUID organizationId, String role) {}
    public record TimeEntryData(UUID id, Instant startTime, Instant endTime, Long durationSeconds) {}
}
