package io.tasky.api.api.sector;

import io.tasky.api.domain.activity.ActivityPriority;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.membership.Role;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SectorOverviewResponse(
        Role role,
        List<DepartmentSummary> departments,
        List<MemberSummary> members,
        List<ProjectSummary> projects,
        Map<ActivityStatus, Long> activityCounts,
        List<ActivitySummary> queue
) {
    public record DepartmentSummary(UUID id, String name) {}

    public record MemberSummary(
            UUID id,
            String displayName,
            Role role,
            UUID departmentId,
            long openActivities,
            long estimatedSeconds
    ) {}

    public record ProjectSummary(UUID id, UUID departmentId, String name, boolean active) {}

    public record ActivitySummary(
            UUID id,
            UUID projectId,
            String projectName,
            String title,
            ActivityStatus status,
            ActivityPriority priority,
            Instant dueDate,
            UUID assignedTo,
            String assigneeName
    ) {}
}
