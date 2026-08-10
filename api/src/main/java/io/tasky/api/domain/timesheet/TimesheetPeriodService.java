package io.tasky.api.domain.timesheet;

import io.tasky.api.api.common.ConflictException;
import io.tasky.api.api.timesheet.TimesheetPeriodQueueItem;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetPeriodService {

    private final TimesheetPeriodRepository timesheetPeriodRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final OrganizationRepository organizationRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public TimesheetPeriod createPeriod(SecurityUser user, Instant requestedStart) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership owner = currentMembership(user, orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        ZoneId zone = zoneOf(org, owner);
        Instant requested = requestedStart != null ? requestedStart : Instant.now();
        Instant[] bounds = canonicalWeekBounds(org, zone, requested);

        return timesheetPeriodRepository
                .findByOrganizationIdAndMembershipIdAndPeriodStartAndPeriodEnd(
                        orgId, owner.getId(), bounds[0], bounds[1])
                .orElseGet(() -> timesheetPeriodRepository.save(TimesheetPeriod.builder()
                        .organization(org)
                        .membership(owner)
                        .periodStart(bounds[0])
                        .periodEnd(bounds[1])
                        .build()));
    }

    public TimesheetPeriod submitPeriod(SecurityUser user, UUID periodId) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        TimesheetPeriod period = getScoped(orgId, periodId);

        if (!permissionService.canSubmitTimesheet(user, period.getMembership().getId())) {
            throw new SecurityException("You cannot submit this timesheet period");
        }
        if (period.getStatus() != TimesheetPeriodStatus.DRAFT
                && period.getStatus() != TimesheetPeriodStatus.REJECTED) {
            throw new ConflictException("Only draft or rejected timesheet periods can be submitted");
        }
        if (timeEntryRepository.existsRunningInPeriod(
                orgId, period.getMembership().getId(), period.getPeriodStart(), period.getPeriodEnd())) {
            throw new ConflictException("Timesheet period contains running time entries");
        }

        period.setStatus(TimesheetPeriodStatus.SUBMITTED);
        period.setSubmittedAt(Instant.now());
        period.setRejectionComment(null);
        TimesheetPeriod saved = timesheetPeriodRepository.save(period);
        auditService.record(orgId, actor.getUser().getId(), actor.getId(), "timesheet_period", periodId,
                "SUBMIT", null, "status=SUBMITTED", null);
        return saved;
    }

    public TimesheetPeriod reopenPeriod(SecurityUser user, UUID periodId) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        TimesheetPeriod period = getScoped(orgId, periodId);

        if (!permissionService.canSubmitTimesheet(user, period.getMembership().getId())) {
            throw new SecurityException("You cannot reopen this timesheet period");
        }
        if (period.getStatus() != TimesheetPeriodStatus.REJECTED) {
            throw new ConflictException("Only rejected timesheet periods can be reopened");
        }

        period.setStatus(TimesheetPeriodStatus.DRAFT);
        period.setRejectionComment(null);
        TimesheetPeriod saved = timesheetPeriodRepository.save(period);
        auditService.record(orgId, actor.getUser().getId(), actor.getId(), "timesheet_period", periodId,
                "REOPEN", null, "status=DRAFT", null);
        return saved;
    }

    public List<TimesheetPeriod> approvePeriods(SecurityUser user, List<UUID> periodIds) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        List<TimesheetPeriod> approved = new ArrayList<>();

        for (UUID periodId : periodIds) {
            TimesheetPeriod period = getScoped(orgId, periodId);
            if (!permissionService.canApproveTimesheetPeriod(user, period)) {
                throw new SecurityException("You cannot approve this timesheet period");
            }
            if (period.getStatus() != TimesheetPeriodStatus.SUBMITTED) {
                throw new ConflictException("Only submitted timesheet periods can be approved");
            }
            period.setStatus(TimesheetPeriodStatus.APPROVED);
            period.setApprovedAt(Instant.now());
            period.setApprovedBy(actor);
            period.setRejectionComment(null);
            TimesheetPeriod saved = timesheetPeriodRepository.save(period);
            approved.add(saved);

            auditService.record(orgId, actor.getUser().getId(), actor.getId(), "timesheet_period", periodId,
                    "APPROVE", null, "status=APPROVED", null);
            notificationService.createOnce(orgId, period.getMembership().getId(),
                    "timesheet-period:" + periodId + ":approved", "TIMESHEET_APPROVED",
                    "Período de apontamentos aprovado", "Sua semana de apontamentos foi aprovada",
                    "timesheet_period", periodId);
        }
        return approved;
    }

    public List<TimesheetPeriod> rejectPeriods(SecurityUser user, List<UUID> periodIds, String comment) {
        if (comment == null || comment.isBlank()) {
            throw new IllegalArgumentException("A rejection comment is required");
        }
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        List<TimesheetPeriod> rejected = new ArrayList<>();

        for (UUID periodId : periodIds) {
            TimesheetPeriod period = getScoped(orgId, periodId);
            if (!permissionService.canApproveTimesheetPeriod(user, period)) {
                throw new SecurityException("You cannot reject this timesheet period");
            }
            if (period.getStatus() != TimesheetPeriodStatus.SUBMITTED) {
                throw new ConflictException("Only submitted timesheet periods can be rejected");
            }
            period.setStatus(TimesheetPeriodStatus.REJECTED);
            period.setApprovedAt(Instant.now());
            period.setApprovedBy(actor);
            period.setRejectionComment(comment);
            TimesheetPeriod saved = timesheetPeriodRepository.save(period);
            rejected.add(saved);

            auditService.record(orgId, actor.getUser().getId(), actor.getId(), "timesheet_period", periodId,
                    "REJECT", null, "status=REJECTED", null);
            notificationService.createOnce(orgId, period.getMembership().getId(),
                    "timesheet-period:" + periodId + ":rejected", "TIMESHEET_REJECTED",
                    "Período de apontamentos rejeitado", comment,
                    "timesheet_period", periodId);
        }
        return rejected;
    }

    public TimesheetPeriod closePeriod(SecurityUser user, UUID periodId) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        TimesheetPeriod period = getScoped(orgId, periodId);

        if (!permissionService.canCloseTimesheetPeriod(user, period)) {
            throw new SecurityException("You cannot close this timesheet period");
        }
        if (period.getStatus() != TimesheetPeriodStatus.APPROVED) {
            throw new ConflictException("Only approved timesheet periods can be closed");
        }

        period.setStatus(TimesheetPeriodStatus.LOCKED);
        TimesheetPeriod saved = timesheetPeriodRepository.save(period);
        auditService.record(orgId, actor.getUser().getId(), actor.getId(), "timesheet_period", periodId,
                "CLOSE", null, "status=LOCKED", null);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<TimesheetPeriod> listOwn(SecurityUser user, Instant from, Instant to) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        if (from != null && to != null) {
            return timesheetPeriodRepository.findOwnBetween(orgId, actor.getId(), from, to);
        }
        if (from != null) {
            return timesheetPeriodRepository.findOwnFrom(orgId, actor.getId(), from);
        }
        if (to != null) {
            return timesheetPeriodRepository.findOwnTo(orgId, actor.getId(), to);
        }
        return timesheetPeriodRepository.findOwnAll(orgId, actor.getId());
    }

    @Transactional(readOnly = true)
    public List<TimesheetPeriodQueueItem> approvalQueue(SecurityUser user) {
        UUID orgId = user.activeOrganizationId();
        OrganizationMembership actor = currentMembership(user, orgId);
        return timesheetPeriodRepository.findApprovalQueue(orgId, actor.getId());
    }

    private TimesheetPeriod getScoped(UUID orgId, UUID periodId) {
        return timesheetPeriodRepository.findByIdAndOrganizationId(periodId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Timesheet period not found"));
    }

    private OrganizationMembership currentMembership(SecurityUser user, UUID orgId) {
        return permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
    }

    private ZoneId zoneOf(Organization org, OrganizationMembership membership) {
        String timezone = membership.getTimezone() != null && !membership.getTimezone().isBlank()
                ? membership.getTimezone()
                : org.getTimezone() != null ? org.getTimezone() : "UTC";
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            return ZoneId.of("UTC");
        }
    }

    private Instant[] canonicalWeekBounds(Organization org, ZoneId zone, Instant requestedStart) {
        int weekStart = org.getWorkWeekStartsOn() >= 1 && org.getWorkWeekStartsOn() <= 7
                ? org.getWorkWeekStartsOn()
                : 1;
        ZonedDateTime zoned = requestedStart.atZone(zone);
        int back = Math.floorMod(zoned.getDayOfWeek().getValue() - weekStart, 7);
        LocalDate weekStartDate = zoned.toLocalDate().minusDays(back);
        Instant periodStart = weekStartDate.atStartOfDay(zone).toInstant();
        Instant periodEnd = weekStartDate.plusDays(7).atStartOfDay(zone).toInstant();
        return new Instant[]{periodStart, periodEnd};
    }
}
