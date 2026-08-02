package io.tasky.api.domain.report;

import io.tasky.api.api.report.ActivityFinancialResponse;
import io.tasky.api.api.report.ApprovalGroupResponse;
import io.tasky.api.api.report.BillableGroupResponse;
import io.tasky.api.api.report.ClientFinancialResponse;
import io.tasky.api.api.report.DepartmentFinancialResponse;
import io.tasky.api.api.report.MemberFinancialResponse;
import io.tasky.api.api.report.ProjectFinancialResponse;
import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.api.report.ReportSummaryResponse;
import io.tasky.api.api.report.TeamFinancialResponse;
import io.tasky.api.api.report.WorkloadMemberResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private static final String[] SHORT_DAY_NAMES = {"Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"};
    private static final double HOUR = 3600.0;

    private final ReportRepository reportRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;

    public ReportSummaryResponse buildSummary(UUID orgId, Instant from, Instant to,
                                              UUID projectId, UUID membershipId,
                                              Set<UUID> scopeMembershipIds) {
        ZoneId zone = ZoneId.of(organizationRepository.getReferenceById(orgId).getTimezone());

        LocalDate base = from != null ? from.atZone(zone).toLocalDate() : LocalDate.now(zone);
        LocalDate monday = base.with(DayOfWeek.MONDAY);
        Instant weekStart = monday.atStartOfDay(zone).toInstant();
        Instant weekEnd = weekStart.plus(Duration.ofDays(7));

        Map<LocalDate, Long> secondsByDay = reportRepository
                .findSecondsByDay(orgId, weekStart, weekEnd, projectId, membershipId, scopeMembershipIds, zone.getId())
                .stream()
                .collect(Collectors.toMap(
                        ReportRepository.DaySecondsRow::getDay,
                        ReportRepository.DaySecondsRow::getSeconds,
                        Long::sum,
                        LinkedHashMap::new));

        List<ReportSummaryResponse.WeeklyHoursPoint> weeklyHours = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = monday.plusDays(i);
            weeklyHours.add(new ReportSummaryResponse.WeeklyHoursPoint(
                    SHORT_DAY_NAMES[day.getDayOfWeek().getValue() - 1],
                    round1(secondsByDay.getOrDefault(day, 0L) / HOUR)));
        }

        List<ReportSummaryResponse.ProjectHoursPoint> projectHours = reportRepository
                .findSecondsByProject(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new ReportSummaryResponse.ProjectHoursPoint(
                        r.getProjectName(),
                        round1(r.getSeconds() / HOUR)))
                .sorted((a, b) -> Double.compare(b.hours(), a.hours()))
                .toList();

        Map<UUID, Long> secondsByMember = reportRepository
                .findSecondsByMember(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .collect(Collectors.toMap(
                        ReportRepository.MemberSecondsRow::getMembershipId,
                        ReportRepository.MemberSecondsRow::getSeconds,
                        Long::sum));
        Map<UUID, Long> activitiesByMember = reportRepository
                .findMemberActivityCount(orgId, from, to, projectId, scopeMembershipIds)
                .stream()
                .collect(Collectors.toMap(
                        ReportRepository.MemberActivityCountRow::getMembershipId,
                        ReportRepository.MemberActivityCountRow::getActivityCount,
                        Long::sum));

        List<ReportSummaryResponse.MemberProductivityPoint> memberProductivity = scopedMemberships(orgId, scopeMembershipIds)
                .stream()
                .map(m -> new ReportSummaryResponse.MemberProductivityPoint(
                        memberName(m),
                        round1(secondsByMember.getOrDefault(m.getId(), 0L) / HOUR),
                        activitiesByMember.getOrDefault(m.getId(), 0L)))
                .sorted((a, b) -> Double.compare(b.hours(), a.hours()))
                .toList();

        List<ReportSummaryResponse.LabelDistributionPoint> labelDistribution = reportRepository
                .findLabelDistribution(orgId, from, to, projectId, scopeMembershipIds)
                .stream()
                .map(r -> new ReportSummaryResponse.LabelDistributionPoint(r.getLabelName(), r.getCount()))
                .sorted((a, b) -> Long.compare(b.count(), a.count()))
                .toList();

        ReportRepository.ReportTotalsProjection totals = reportRepository
                .findTotals(orgId, from, to, projectId, membershipId, scopeMembershipIds);
        double totalHours = round1(totals.getSeconds() / HOUR);
        double billableHours = round1(totals.getBillableSeconds() / HOUR);

        long daysWithWork = reportRepository
                .findCountDistinctWorkDays(orgId, from, to, projectId, membershipId, scopeMembershipIds, zone.getId())
                .getCount();
        double dailyAverage = daysWithWork > 0 ? round1(totalHours / daysWithWork) : 0.0;

        long estimatedSeconds = reportRepository
                .findTotalEstimatedSeconds(orgId, from, to, projectId, scopeMembershipIds)
                .getEstimatedSeconds();
        long actualSeconds = totals.getSeconds();
        long remainingSeconds = Math.max(0, estimatedSeconds - actualSeconds);
        double progressPercent = estimatedSeconds > 0 ? round1(actualSeconds * 100.0 / estimatedSeconds) : 0.0;

        long totalActivities = reportRepository
                .findCountActivities(orgId, from, to, projectId, scopeMembershipIds)
                .getCount();

        BigDecimal revenue = totals.getRevenue();
        BigDecimal cost = totals.getCost();
        BigDecimal margin = revenue.subtract(cost);

        return new ReportSummaryResponse(
                weeklyHours, projectHours, memberProductivity, labelDistribution,
                dailyAverage, totalHours, totalActivities, billableHours, round1(totalHours - billableHours),
                estimatedSeconds, actualSeconds, remainingSeconds, progressPercent,
                moneyDouble(revenue), moneyDouble(cost), moneyDouble(margin));
    }

    public List<ReportDetailedRow> getDetailed(UUID orgId, Instant from, Instant to,
                                               UUID projectId, UUID membershipId,
                                               Set<UUID> scopeMembershipIds) {
        List<ReportRepository.DetailedRowProjection> rows = reportRepository
                .findDetailedRows(orgId, from, to, projectId, membershipId, scopeMembershipIds);
        Map<UUID, List<String>> tagsByEntry = reportRepository
                .findTagsByEntry(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .collect(Collectors.groupingBy(
                        ReportRepository.TimeEntryTagRow::getTimeEntryId,
                        LinkedHashMap::new,
                        Collectors.mapping(ReportRepository.TimeEntryTagRow::getTag, Collectors.toList())));
        return toDetailedRows(rows, tagsByEntry);
    }

    public Page<ReportDetailedRow> getDetailedPage(UUID orgId, Instant from, Instant to,
                                                   UUID projectId, UUID membershipId,
                                                   Set<UUID> scopeMembershipIds, Pageable pageable) {
        Page<ReportRepository.DetailedRowProjection> page = reportRepository
                .findDetailedRowsPage(orgId, from, to, projectId, membershipId, scopeMembershipIds, pageable);
        Map<UUID, List<String>> tagsByEntry = page.getContent().isEmpty()
                ? Map.of()
                : reportRepository
                        .findTagsByEntryIds(page.getContent().stream().map(ReportRepository.DetailedRowProjection::getId).toList())
                        .stream()
                        .collect(Collectors.groupingBy(
                                ReportRepository.TimeEntryTagRow::getTimeEntryId,
                                LinkedHashMap::new,
                                Collectors.mapping(ReportRepository.TimeEntryTagRow::getTag, Collectors.toList())));
        return new PageImpl<>(toDetailedRows(page.getContent(), tagsByEntry), pageable, page.getTotalElements());
    }

    private List<ReportDetailedRow> toDetailedRows(List<ReportRepository.DetailedRowProjection> rows,
                                                   Map<UUID, List<String>> tagsByEntry) {
        return rows.stream()
                .map(r -> new ReportDetailedRow(
                        r.getId(),
                        r.getProjectName() != null ? r.getProjectName() : "—",
                        r.getMemberName(),
                        r.getDescription(),
                        r.getStartTime(),
                        r.getEndTime(),
                        round1((r.getDurationSeconds() != null ? r.getDurationSeconds() : 0L) / HOUR),
                        r.getApprovalStatus(),
                        moneyDouble(r.getRevenue()),
                        moneyDouble(r.getCost()),
                        moneyDouble(r.getRevenue().subtract(r.getCost())),
                        r.isBillable(),
                        new ArrayList<>(tagsByEntry.getOrDefault(r.getId(), List.of()))))
                .toList();
    }

    public List<WorkloadMemberResponse> getWorkload(UUID orgId, Instant from, Instant to,
                                                    Set<UUID> scopeMembershipIds) {
        long days = from != null && to != null ? Math.max(1, Duration.between(from, to).toDays() + 1) : 7;
        Map<UUID, Long> estimated = reportRepository
                .findMemberEstimatedSeconds(orgId, from, to, null, scopeMembershipIds)
                .stream()
                .collect(Collectors.toMap(
                        ReportRepository.MemberEstimatedSecondsRow::getMembershipId,
                        ReportRepository.MemberEstimatedSecondsRow::getEstimatedSeconds,
                        Long::sum));
        Map<UUID, Long> actual = reportRepository
                .findSecondsByMember(orgId, from, to, null, null, scopeMembershipIds)
                .stream()
                .collect(Collectors.toMap(
                        ReportRepository.MemberSecondsRow::getMembershipId,
                        ReportRepository.MemberSecondsRow::getSeconds,
                        Long::sum));
        return scopedMemberships(orgId, scopeMembershipIds).stream()
                .map(m -> {
                    long capacity = days * m.getMaxDailyWorkMinutes() * 60L;
                    long estimatedSeconds = estimated.getOrDefault(m.getId(), 0L);
                    long actualSeconds = actual.getOrDefault(m.getId(), 0L);
                    return new WorkloadMemberResponse(
                            m.getId(),
                            memberName(m),
                            capacity,
                            estimatedSeconds,
                            actualSeconds,
                            capacity > 0 ? round1(estimatedSeconds * 100.0 / capacity) : 0.0);
                })
                .toList();
    }

    public List<ProjectFinancialResponse> getProjectFinancials(UUID orgId, Instant from, Instant to,
                                                               UUID projectId, UUID membershipId,
                                                               Set<UUID> scopeMembershipIds) {
        return reportRepository.findProjectFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new ProjectFinancialResponse(
                        r.getProjectId(), r.getProjectName(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        r.getBudgetSeconds(), r.getBudgetAmount(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<MemberFinancialResponse> getMemberFinancials(UUID orgId, Instant from, Instant to,
                                                             UUID projectId, UUID membershipId,
                                                             Set<UUID> scopeMembershipIds) {
        return reportRepository.findMemberFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new MemberFinancialResponse(
                        r.getMembershipId(), r.getMemberName(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<ActivityFinancialResponse> getActivityFinancials(UUID orgId, Instant from, Instant to,
                                                                 UUID projectId, UUID membershipId,
                                                                 Set<UUID> scopeMembershipIds) {
        return reportRepository.findActivityFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new ActivityFinancialResponse(
                        r.getActivityId(), r.getActivityTitle(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<DepartmentFinancialResponse> getDepartmentFinancials(UUID orgId, Instant from, Instant to,
                                                                     UUID projectId, UUID membershipId,
                                                                     Set<UUID> scopeMembershipIds) {
        return reportRepository.findDepartmentFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new DepartmentFinancialResponse(
                        r.getDepartmentId(), r.getDepartmentName(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<TeamFinancialResponse> getTeamFinancials(UUID orgId, Instant from, Instant to,
                                                         UUID projectId, UUID membershipId,
                                                         Set<UUID> scopeMembershipIds) {
        return reportRepository.findTeamFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new TeamFinancialResponse(
                        r.getTeamId(), r.getTeamName(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<ClientFinancialResponse> getClientFinancials(UUID orgId, Instant from, Instant to,
                                                             UUID projectId, UUID membershipId,
                                                             Set<UUID> scopeMembershipIds) {
        return reportRepository.findClientFinancials(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new ClientFinancialResponse(
                        r.getClientId(), r.getClientName(),
                        r.getEstimatedSeconds(), r.getActualApprovedSeconds(), r.getActualNotApprovedSeconds(),
                        r.getRemainingSeconds(), r.getProgressPercent(),
                        money(r.getCost()), money(r.getRevenue()), money(r.getMargin())))
                .toList();
    }

    public List<ApprovalGroupResponse> getApprovalGrouping(UUID orgId, Instant from, Instant to,
                                                           UUID projectId, UUID membershipId,
                                                           Set<UUID> scopeMembershipIds) {
        return reportRepository.findApprovalGrouping(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new ApprovalGroupResponse(r.getApprovalStatus(), r.getSeconds(), r.getEntries()))
                .toList();
    }

    public List<BillableGroupResponse> getBillableGrouping(UUID orgId, Instant from, Instant to,
                                                           UUID projectId, UUID membershipId,
                                                           Set<UUID> scopeMembershipIds) {
        return reportRepository.findBillableGrouping(orgId, from, to, projectId, membershipId, scopeMembershipIds)
                .stream()
                .map(r -> new BillableGroupResponse(r.isBillable(), r.getSeconds(), r.getEntries()))
                .toList();
    }

    public String requireSupportedExportFormat(String format) {
        String requested = format == null || format.isBlank() ? "csv" : format.trim().toLowerCase(java.util.Locale.ROOT);
        if (!"csv".equals(requested)) {
            throw new IllegalArgumentException("Unsupported export format: " + requested);
        }
        return requested;
    }

    public String buildCsv(List<ReportDetailedRow> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("Projeto;Membro;Descrição;Início;Fim;Horas;Aprovação;Receita;Custo;Margem;Billável;Tags\n");
        for (ReportDetailedRow r : rows) {
            sb.append(csv(r.projectName())).append(';')
              .append(csv(r.memberName())).append(';')
              .append(csv(r.description())).append(';')
              .append(r.startTime()).append(';')
              .append(r.endTime() != null ? r.endTime() : "").append(';')
              .append(String.format("%.2f", r.hours())).append(';')
              .append(r.approvalStatus()).append(';')
              .append(String.format("%.2f", r.revenue())).append(';')
              .append(String.format("%.2f", r.cost())).append(';')
              .append(String.format("%.2f", r.margin())).append(';')
              .append(r.billable() ? "Sim" : "Não").append(';')
              .append(csv(String.join(", ", r.tags()))).append('\n');
        }
        return sb.toString();
    }

    private List<OrganizationMembership> scopedMemberships(UUID orgId, Set<UUID> scopeMembershipIds) {
        return membershipRepository.findByOrganizationId(orgId).stream()
                .filter(m -> scopeMembershipIds.contains(m.getId()))
                .sorted(Comparator.comparing(this::memberName))
                .toList();
    }

    private String csv(String value) {
        if (value == null) return "";
        String safeValue = value;
        int firstNonWhitespace = 0;
        while (firstNonWhitespace < safeValue.length() && Character.isWhitespace(safeValue.charAt(firstNonWhitespace))) {
            firstNonWhitespace++;
        }
        if (firstNonWhitespace < safeValue.length() && "=+-@".indexOf(safeValue.charAt(firstNonWhitespace)) >= 0) {
            safeValue = "'" + safeValue;
        }
        return "\"" + safeValue.replace("\"", "\"\"") + "\"";
    }

    private String memberName(OrganizationMembership m) {
        String display = m.getUser().getDisplayName();
        return (display != null && !display.isBlank()) ? display : m.getUser().getUsername();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static double moneyDouble(BigDecimal value) {
        return value == null ? 0.0 : value.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
