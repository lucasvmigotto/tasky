package io.tasky.api.domain.report;

import io.tasky.api.api.report.ExportJobResponse;
import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportExportService {

    private static final Duration JOB_TTL = Duration.ofHours(1);

    private final ReportExportJobRepository reportExportJobRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;
    private final ReportService reportService;

    @Transactional
    public ExportJobResponse create(UUID orgId, UUID ownerMembershipId,
                                    Instant from, Instant to, UUID projectId, UUID membershipId,
                                    Set<UUID> scopeMembershipIds, String format) {
        String supportedFormat = reportService.requireSupportedExportFormat(format);
        OrganizationMembership owner = requireActiveMembership(orgId, ownerMembershipId);
        Instant now = Instant.now();

        ReportExportJob job = ReportExportJob.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .owner(owner)
                .status(ReportExportStatus.PROCESSING)
                .format(supportedFormat)
                .params(buildParams(from, to, projectId, membershipId, supportedFormat))
                .expiresAt(now.plus(JOB_TTL))
                .build();
        job = reportExportJobRepository.save(job);
        reportExportJobRepository.flush();

        try {
            reportService.buildCsv(reportService.getDetailed(
                    orgId,
                    from,
                    to,
                    projectId,
                    membershipId,
                    scopeMembershipIds));
            job.setStatus(ReportExportStatus.READY);
            job.setDownloadUrl("/api/v1/reports/exports/" + job.getId() + "/download");
            job.setExpiresAt(now.plus(JOB_TTL));
        } catch (RuntimeException ex) {
            job.setStatus(ReportExportStatus.FAILED);
            job.setExpiresAt(now.plus(JOB_TTL));
            throw ex;
        }
        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public ExportJobResponse get(UUID orgId, UUID callerMembershipId, boolean admin, UUID jobId) {
        ReportExportJob job = reportExportJobRepository.findByIdAndOrganizationId(jobId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Export job not found"));
        requireAccess(callerMembershipId, admin, job);
        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public String downloadCsv(UUID orgId, UUID callerMembershipId, boolean admin, UUID jobId,
                              Set<UUID> scopeMembershipIds) {
        ReportExportJob job = reportExportJobRepository.findByIdAndOrganizationId(jobId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Export job not found"));
        requireAccess(callerMembershipId, admin, job);
        if (job.getStatus() != ReportExportStatus.READY) {
            throw new IllegalStateException("Export job is not ready");
        }
        if (job.getExpiresAt() != null && Instant.now().isAfter(job.getExpiresAt())) {
            throw new IllegalArgumentException("Export job has expired");
        }
        List<ReportDetailedRow> rows = reportService.getDetailed(
                orgId,
                instantParam(job.getParams(), "from"),
                instantParam(job.getParams(), "to"),
                uuidParam(job.getParams(), "projectId"),
                uuidParam(job.getParams(), "membershipId"),
                scopeMembershipIds);
        return reportService.buildCsv(rows);
    }

    private Map<String, Object> buildParams(Instant from, Instant to, UUID projectId, UUID membershipId, String format) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("format", format);
        if (from != null) {
            params.put("from", from.toString());
        }
        if (to != null) {
            params.put("to", to.toString());
        }
        if (projectId != null) {
            params.put("projectId", projectId.toString());
        }
        if (membershipId != null) {
            params.put("membershipId", membershipId.toString());
        }
        return params;
    }

    private Instant instantParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? Instant.parse(String.valueOf(value)) : null;
    }

    private UUID uuidParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? UUID.fromString(String.valueOf(value)) : null;
    }

    private OrganizationMembership requireActiveMembership(UUID orgId, UUID membershipId) {
        return membershipRepository.findByIdAndOrganizationIdAndIsActiveTrue(membershipId, orgId)
                .orElseThrow(() -> new SecurityException("Not an active member of this organization"));
    }

    private void requireAccess(UUID callerMembershipId, boolean admin, ReportExportJob job) {
        if (!admin && !job.getOwner().getId().equals(callerMembershipId)) {
            throw new SecurityException("You do not have access to this export job");
        }
    }

    private ExportJobResponse toResponse(ReportExportJob job) {
        return new ExportJobResponse(
                job.getId(),
                job.getStatus().name(),
                job.getFormat(),
                job.getDownloadUrl(),
                job.getCreatedAt(),
                job.getExpiresAt());
    }
}
