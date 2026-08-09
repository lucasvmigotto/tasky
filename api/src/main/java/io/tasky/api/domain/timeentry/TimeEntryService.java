package io.tasky.api.domain.timeentry;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.api.timeentry.TimeEntryResponse;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TimeEntryService {

    private final TimeEntryRepository timeEntryRepository;
    private final OrganizationRepository organizationRepository;
    private final ProjectRepository projectRepository;
    private final ActivityRepository activityRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public TimeEntry startEntry(UUID orgId, OrganizationMembership membership,
                                UUID projectId, UUID activityId, String description, String glpiTicketId,
                                boolean billable) {
        Organization org = organizationRepository.getReferenceById(orgId);
        timeEntryRepository.acquireMembershipLock(membership.getId());

        timeEntryRepository.findTopByMembershipIdAndEndTimeIsNullOrderByStartTimeDesc(membership.getId())
                .ifPresent(existing -> {
                    throw new io.tasky.api.api.common.ConflictException(
                            "There is already a running time entry for this member");
                });

        Project project = resolveProject(orgId, projectId);
        Activity activity = resolveActivity(orgId, activityId);
        ensureProjectActivityConsistency(project, activity);

        TimeEntry entry = TimeEntry.builder()
                .membership(membership)
                .organization(org)
                .project(project)
                .activity(activity)
                .description(description)
                .glpiTicketId(normalizeGlpiTicketId(glpiTicketId))
                .startTime(Instant.now())
                .billable(billable)
                .billingRateSnapshot(project != null ? project.getHourlyRate() : null)
                .costRateSnapshot(membership.getCostRate())
                .build();
        return timeEntryRepository.save(entry);
    }

    public TimeEntry manualEntry(UUID orgId, OrganizationMembership membership,
                                 Instant startTime, Instant endTime,
                                 UUID projectId, UUID activityId, String description, String glpiTicketId,
                                 boolean billable) {
        timeEntryRepository.acquireMembershipLock(membership.getId());
        if (endTime == null || !endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        Organization org = organizationRepository.getReferenceById(orgId);

        Project project = resolveProject(orgId, projectId);
        Activity activity = resolveActivity(orgId, activityId);
        ensureProjectActivityConsistency(project, activity);

        validateNoOverlap(orgId, membership.getId(), null, startTime, endTime);

        TimeEntry entry = TimeEntry.builder()
                .membership(membership)
                .organization(org)
                .project(project)
                .activity(activity)
                .description(description)
                .glpiTicketId(normalizeGlpiTicketId(glpiTicketId))
                .startTime(startTime)
                .endTime(endTime)
                .durationSeconds(Duration.between(startTime, endTime).getSeconds())
                .billable(billable)
                .billingRateSnapshot(project != null ? project.getHourlyRate() : null)
                .costRateSnapshot(membership.getCostRate())
                .build();
        return timeEntryRepository.save(entry);
    }

    private Project resolveProject(UUID orgId, UUID projectId) {
        return projectId != null
                ? projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                        .orElseThrow(() -> new IllegalArgumentException("Project not found"))
                : null;
    }

    private Activity resolveActivity(UUID orgId, UUID activityId) {
        return activityId != null
                ? activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                        .orElseThrow(() -> new IllegalArgumentException("Activity not found"))
                : null;
    }

    private void ensureProjectActivityConsistency(Project project, Activity activity) {
        if (activity != null && (project == null || !activity.getProject().getId().equals(project.getId()))) {
            throw new IllegalArgumentException("Activity does not belong to the selected project");
        }
    }

    public TimeEntry stopEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);
        if (entry.getEndTime() != null) {
            return entry;
        }
        Instant end = Instant.now();
        entry.setEndTime(end);
        entry.setDurationSeconds(effectiveElapsedSeconds(entry, end));
        entry.setPausedAt(null);
        return timeEntryRepository.save(entry);
    }

    public TimeEntry pauseEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);
        if (entry.getEndTime() != null) {
            throw new io.tasky.api.api.common.ConflictException("Time entry is already stopped");
        }
        if (entry.getPausedAt() != null) {
            return entry;
        }
        entry.setPausedAt(Instant.now());
        return timeEntryRepository.save(entry);
    }

    public TimeEntry resumeEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);
        if (entry.getEndTime() != null) {
            throw new io.tasky.api.api.common.ConflictException("Time entry is already stopped");
        }
        if (entry.getPausedAt() == null) {
            return entry;
        }
        long pausedDelta = Duration.between(entry.getPausedAt(), Instant.now()).getSeconds();
        entry.setPausedSeconds(entry.getPausedSeconds() + Math.max(0, pausedDelta));
        entry.setPausedAt(null);
        return timeEntryRepository.save(entry);
    }

    private long effectiveElapsedSeconds(TimeEntry entry, Instant end) {
        long wall = Duration.between(entry.getStartTime(), end).getSeconds();
        long paused = entry.getPausedSeconds();
        if (entry.getPausedAt() != null) {
            paused += Math.max(0, Duration.between(entry.getPausedAt(), end).getSeconds());
        }
        return Math.max(0, wall - paused);
    }

    public TimeEntry updateEntry(UUID orgId, UUID membershipId, UUID entryId,
                                 UUID projectId, UUID activityId, String description, String glpiTicketId,
                                 Instant startTime, Instant endTime, Boolean billable) {
        timeEntryRepository.acquireMembershipLock(membershipId);
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);

        requireEditable(entry);

        Project project = projectId != null ? resolveProject(orgId, projectId) : entry.getProject();
        Activity activity = activityId != null ? resolveActivity(orgId, activityId) : entry.getActivity();
        ensureProjectActivityConsistency(project, activity);
        entry.setProject(project);
        entry.setActivity(activity);

        if (description != null) {
            entry.setDescription(description);
        }
        if (glpiTicketId != null) {
            entry.setGlpiTicketId(normalizeGlpiTicketId(glpiTicketId));
        }
        if (billable != null) {
            entry.setBillable(billable);
        }

        Instant start = startTime != null ? startTime : entry.getStartTime();
        Instant end = endTime != null ? endTime : entry.getEndTime();
        if (end != null && !end.isAfter(start)) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        entry.setStartTime(start);
        entry.setEndTime(end);
        entry.setDurationSeconds(end != null ? Duration.between(start, end).getSeconds() : null);

        if (end != null) {
            validateNoOverlap(orgId, membershipId, entryId, start, end);
        }

        return timeEntryRepository.save(entry);
    }

    public TimeEntry submitEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);
        if (entry.getEndTime() == null) {
            throw new io.tasky.api.api.common.ConflictException("Running time entries cannot be submitted");
        }
        if (entry.getApprovalStatus() != TimeEntryApprovalStatus.DRAFT
                && entry.getApprovalStatus() != TimeEntryApprovalStatus.REJECTED) {
            throw new io.tasky.api.api.common.ConflictException("Only draft or rejected time entries can be submitted");
        }
        entry.setApprovalStatus(TimeEntryApprovalStatus.SUBMITTED);
        entry.setSubmittedAt(Instant.now());
        entry.setRejectionComment(null);
        TimeEntry saved = timeEntryRepository.save(entry);
        auditService.record(orgId, entry.getMembership().getUser().getId(), entry.getMembership().getId(), "time_entry", entryId,
                "SUBMIT", null, "status=SUBMITTED", null);
        return saved;
    }

    public TimeEntry approveEntry(UUID orgId, UUID entryId, OrganizationMembership approver) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        if (!entry.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Time entry does not belong to this organization");
        }
        requireSubmittedAndStopped(entry);
        entry.setApprovalStatus(TimeEntryApprovalStatus.APPROVED);
        entry.setApprovedAt(Instant.now());
        entry.setApprovedBy(approver);
        entry.setRejectionComment(null);
        TimeEntry saved = timeEntryRepository.save(entry);
        auditService.record(orgId, approver.getUser().getId(), approver.getId(), "time_entry", entryId,
                "APPROVE", null, "status=APPROVED", null);
        notificationService.createOnce(orgId, entry.getMembership().getId(),
                "time-entry:" + entryId + ":approved:" + saved.getApprovedAt(), "TIME_ENTRY_APPROVED",
                "Apontamento aprovado", entry.getDescription(), "time_entry", entryId);
        return saved;
    }

    public TimeEntry rejectEntry(UUID orgId, UUID entryId, OrganizationMembership approver, String comment) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        if (!entry.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Time entry does not belong to this organization");
        }
        requireSubmittedAndStopped(entry);
        entry.setApprovalStatus(TimeEntryApprovalStatus.REJECTED);
        entry.setApprovedAt(Instant.now());
        entry.setApprovedBy(approver);
        entry.setRejectionComment(comment);
        TimeEntry saved = timeEntryRepository.save(entry);
        auditService.record(orgId, approver.getUser().getId(), approver.getId(), "time_entry", entryId,
                "REJECT", null, "status=REJECTED", null);
        notificationService.createOnce(orgId, entry.getMembership().getId(),
                "time-entry:" + entryId + ":rejected:" + saved.getApprovedAt(), "TIME_ENTRY_REJECTED",
                "Apontamento rejeitado", comment, "time_entry", entryId);
        return saved;
    }

    private String normalizeGlpiTicketId(String glpiTicketId) {
        if (glpiTicketId == null || glpiTicketId.isBlank()) {
            return null;
        }
        String normalized = glpiTicketId.trim();
        return normalized.length() > 64 ? normalized.substring(0, 64) : normalized;
    }

    private void validateNoOverlap(UUID orgId, UUID membershipId, UUID editingId, Instant start, Instant end) {
        List<TimeEntry> overlapping = timeEntryRepository.findOverlapping(
                orgId, membershipId, start, end, editingId);
        if (!overlapping.isEmpty()) {
            String ids = overlapping.stream().map(e -> e.getId().toString()).reduce((a, b) -> a + ", " + b).orElse("");
            throw new io.tasky.api.api.common.ConflictException(
                    "Time entry overlaps with existing entries: " + ids);
        }
    }

    public void deleteEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = getOwnedEntry(orgId, membershipId, entryId);
        timeEntryRepository.delete(entry);
    }

    private void requirePeriodNotClosedOrLocked(TimeEntry entry) {
        requireNoClosedOrLockedPeriodAt(
                entry.getOrganization().getId(), entry.getMembership().getId(), entry.getStartTime());
    }

    private void requireNoClosedOrLockedPeriodAt(UUID orgId, UUID membershipId, Instant startTime) {
        if (timeEntryRepository.existsClosedOrLockedPeriodFor(orgId, membershipId, startTime)) {
            throw new io.tasky.api.api.common.ConflictException(
                    "Time entry belongs to a locked or closed timesheet period and cannot be modified");
        }
    }

    private void requireEditable(TimeEntry entry) {
        if (entry.getApprovalStatus() == TimeEntryApprovalStatus.SUBMITTED
                || entry.getApprovalStatus() == TimeEntryApprovalStatus.APPROVED
                || entry.getApprovalStatus() == TimeEntryApprovalStatus.LOCKED) {
            throw new io.tasky.api.api.common.ConflictException(
                    "Submitted, approved, or locked time entries cannot be edited or deleted");
        }
    }

    private void requireSubmittedAndStopped(TimeEntry entry) {
        if (entry.getApprovalStatus() != TimeEntryApprovalStatus.SUBMITTED) {
            throw new io.tasky.api.api.common.ConflictException("Only submitted time entries can be approved or rejected");
        }
        if (entry.getEndTime() == null) {
            throw new io.tasky.api.api.common.ConflictException("Running time entries cannot be approved or rejected");
        }
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<TimeEntryResponse> getPage(UUID orgId, UUID membershipId, Instant from, Instant to,
                                                        UUID projectId, Pageable pageable) {
        return toPage(timeEntryRepository.findPageByMembership(orgId, membershipId, from, to, projectId, pageable));
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<TimeEntryResponse> getOrganizationPage(UUID orgId, Instant from, Instant to,
                                                                    Pageable pageable) {
        return toPage(timeEntryRepository.findPageForOrganization(orgId, from, to, pageable));
    }

    private PaginatedResponse<TimeEntryResponse> toPage(Page<TimeEntryProjection> page) {
        List<TimeEntryProjection> rows = page.getContent();
        List<TimeEntryResponse> content = rows.stream()
                .map(this::toResponse)
                .toList();
        return new PaginatedResponse<>(content, page.getTotalElements(), page.getTotalPages(),
                page.getSize(), page.getNumber());
    }

    private TimeEntryResponse toResponse(TimeEntryProjection entry) {
        return new TimeEntryResponse(
                entry.getId(),
                entry.getOrganizationId(),
                entry.getMembershipId(),
                entry.getUserId(),
                entry.getProjectId(),
                entry.getActivityId(),
                entry.getDescription(),
                entry.getGlpiTicketId(),
                entry.getStartTime(),
                entry.getEndTime(),
                entry.getDurationSeconds(),
                entry.getPausedSeconds(),
                entry.getPausedAt(),
                entry.getApprovalStatus() != null
                        ? TimeEntryApprovalStatus.valueOf(entry.getApprovalStatus())
                        : TimeEntryApprovalStatus.DRAFT,
                entry.getSubmittedAt(),
                entry.getApprovedAt(),
                entry.getApprovedBy(),
                entry.getRejectionComment(),
                entry.getBillingRateSnapshot(),
                entry.getCostRateSnapshot(),
                Boolean.TRUE.equals(entry.getBillable()),
                entry.getCreatedAt()
        );
    }

    public TimeEntry getRunningEntry(UUID orgId, UUID membershipId) {
        return timeEntryRepository.findTopByMembershipIdAndEndTimeIsNullOrderByStartTimeDesc(membershipId)
                .filter(e -> e.getOrganization().getId().equals(orgId))
                .orElse(null);
    }

    private TimeEntry getOwnedEntry(UUID orgId, UUID membershipId, UUID entryId) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));
        if (!entry.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Time entry does not belong to this organization");
        }
        if (!entry.getMembership().getId().equals(membershipId)) {
            throw new SecurityException("You can only manage your own time entries");
        }
        return entry;
    }
}
