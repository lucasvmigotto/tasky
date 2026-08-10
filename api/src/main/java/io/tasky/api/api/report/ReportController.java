package io.tasky.api.api.report;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.report.ReportExportService;
import io.tasky.api.domain.report.ReportService;
import io.tasky.api.domain.report.SavedReportService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Transactional
public class ReportController {

    private final ReportService reportService;
    private final SavedReportService savedReportService;
    private final ReportExportService reportExportService;
    private final PermissionService permissionService;

    @GetMapping("/summary")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<ReportSummaryResponse> summary(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.buildSummary(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null))));
    }

    @GetMapping("/detailed")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<ReportDetailedRow>> detailed(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getDetailed(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null))));
    }

    @GetMapping("/detailed/page")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<PaginatedResponse<ReportDetailedRow>> detailedPage(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requireFinancialReportsAccess(user);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 500));
        Page<ReportDetailedRow> result = reportService.getDetailedPage(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null)), pageable);
        return ResponseEntity.ok(new PaginatedResponse<>(
                result.getContent(), result.getTotalElements(), result.getTotalPages(),
                result.getSize(), result.getNumber()));
    }

    @GetMapping("/workload")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<WorkloadMemberResponse>> workload(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getWorkload(
                orgId, from.orElse(null), to.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null))));
    }

    @GetMapping("/financials/projects")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<ProjectFinancialResponse>> projectFinancials(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getProjectFinancials(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null), reportScope(user, orgId, null)));
    }

    @GetMapping("/financials/members")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<MemberFinancialResponse>> memberFinancials(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getMemberFinancials(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null), reportScope(user, orgId, null)));
    }

    @GetMapping("/financials/activities")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<ActivityFinancialResponse>> activityFinancials(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getActivityFinancials(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null), reportScope(user, orgId, null)));
    }

    @GetMapping("/financials/departments")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<DepartmentFinancialResponse>> departmentFinancials(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getDepartmentFinancials(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null), reportScope(user, orgId, null)));
    }

    @GetMapping("/groupings/approval")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<ApprovalGroupResponse>> approvalGrouping(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getApprovalGrouping(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null))));
    }

    @GetMapping("/groupings/billable")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<BillableGroupResponse>> billableGrouping(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("departmentId") Optional<UUID> departmentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportService.getBillableGrouping(
                orgId, from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, departmentId.orElse(null))));
    }

    @PostMapping("/saved")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<SavedReportResponse> createSavedReport(
            @RequestBody @Valid CreateSavedReportRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(savedReportService.create(orgId, requireMembershipId(user, orgId), request));
    }

    @GetMapping("/saved")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<List<SavedReportResponse>> listSavedReports(@AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(savedReportService.list(orgId, requireMembershipId(user, orgId), isAdmin(user, orgId)));
    }

    @GetMapping("/saved/{reportId}")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<SavedReportResponse> getSavedReport(
            @PathVariable("reportId") UUID reportId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(savedReportService.get(orgId, requireMembershipId(user, orgId), isAdmin(user, orgId), reportId));
    }

    @GetMapping("/exports")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<ExportJobResponse> createExportJob(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam("format") Optional<String> format,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        ExportJobResponse job = reportExportService.create(
                orgId, requireMembershipId(user, orgId),
                from.orElse(null), to.orElse(null),
                projectId.orElse(null), membershipId.orElse(null),
                reportScope(user, orgId, null), format.orElse("csv"));
        return ResponseEntity.accepted().body(job);
    }

    @GetMapping("/exports/{jobId}")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<ExportJobResponse> getExportJob(
            @PathVariable("jobId") UUID jobId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        return ResponseEntity.ok(reportExportService.get(orgId, requireMembershipId(user, orgId), isAdmin(user, orgId), jobId));
    }

    @GetMapping("/exports/{jobId}/download")
    @PreAuthorize("@access.canViewFinancialReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<String> downloadExportJob(
            @PathVariable("jobId") UUID jobId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requireFinancialReportsAccess(user);
        String csv = reportExportService.downloadCsv(
                orgId, requireMembershipId(user, orgId), isAdmin(user, orgId), jobId, reportScope(user, orgId, null));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasky-report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    private UUID requireFinancialReportsAccess(SecurityUser user) {
        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            throw new SecurityException("No active organization");
        }
        if (!permissionService.canViewFinancialReports(user, orgId)) {
            throw new SecurityException("You do not have permission to view financial reports");
        }
        return orgId;
    }

    private Set<UUID> reportScope(SecurityUser user, UUID orgId, UUID departmentId) {
        return permissionService.scopedMembershipIdsForDepartment(user, orgId, departmentId);
    }

    private UUID requireMembershipId(SecurityUser user, UUID orgId) {
        return permissionService.getMembership(user.id(), orgId)
                .map(OrganizationMembership::getId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
    }

    private boolean isAdmin(SecurityUser user, UUID orgId) {
        return permissionService.isAdmin(user.id(), orgId);
    }
}
