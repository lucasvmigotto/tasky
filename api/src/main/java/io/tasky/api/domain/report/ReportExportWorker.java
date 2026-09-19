package io.tasky.api.domain.report;

import io.tasky.api.api.report.ReportDetailedRow;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.storage.FileStorageService;
import io.tasky.api.domain.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PHASE 7 (T-EXP): async export worker without a broker. Single-node safe via
 * row-level locking ({@code FOR UPDATE SKIP LOCKED}); multi-node needs
 * ShedLock (documented, not added until a second node exists).
 */
@Component
@RequiredArgsConstructor
public class ReportExportWorker {

    private static final Logger log = LoggerFactory.getLogger(ReportExportWorker.class);
    private static final int MAX_ATTEMPTS = 3;

    private final ReportExportJobRepository jobRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ReportService reportService;
    private final FileStorageService fileStorageService;

    @Scheduled(fixedDelayString = "${tasky.exports.worker-delay-ms:5000}")
    @Transactional
    public void processPending() {
        List<ReportExportJob> claimed = jobRepository.claimCandidates(
                ReportExportStatus.PROCESSING, PageRequest.of(0, 1));
        if (claimed.isEmpty()) {
            return;
        }
        ReportExportJob job = claimed.get(0);
        job.setAttempts(job.getAttempts() + 1);
        try {
            String csv = reportService.buildCsv(reportService.getDetailed(
                    job.getOrganization().getId(),
                    instantParam(job.getParams(), "from"),
                    instantParam(job.getParams(), "to"),
                    uuidParam(job.getParams(), "projectId"),
                    uuidParam(job.getParams(), "membershipId"),
                    ownerScope(job)));
            StoredFile stored = fileStorageService.upload(
                    job.getOrganization().getId(), job.getOwner(),
                    "tasky-report-" + job.getId() + ".csv", "text/csv",
                    csv.getBytes(StandardCharsets.UTF_8));
            job.setStoredFile(stored);
            job.setStatus(ReportExportStatus.READY);
            job.setDownloadUrl("/api/v1/reports/exports/" + job.getId() + "/download");
            job.setLastError(null);
        } catch (RuntimeException ex) {
            log.warn("Export job {} failed (attempt {})", job.getId(), job.getAttempts(), ex);
            job.setLastError(truncate(String.valueOf(ex.getMessage())));
            if (job.getAttempts() >= MAX_ATTEMPTS) {
                job.setStatus(ReportExportStatus.FAILED);
            }
        }
    }

    private java.util.Set<UUID> ownerScope(ReportExportJob job) {
        // Visibility frozen at request time (stored in job params).
        Object scope = job.getParams().get("scope");
        if (scope instanceof java.util.Collection<?> ids) {
            return ids.stream().map(id -> UUID.fromString(String.valueOf(id)))
                    .collect(java.util.stream.Collectors.toSet());
        }
        // Legacy jobs (pre-Phase 7): fall back to the owner's current scope.
        OrganizationMembership owner = membershipRepository
                .findByIdAndOrganizationIdAndIsActiveTrue(
                        job.getOwner().getId(), job.getOrganization().getId())
                .orElseThrow(() -> new IllegalArgumentException("Export owner is no longer active"));
        return java.util.Set.of(owner.getId());
    }

    private Instant instantParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? Instant.parse(String.valueOf(value)) : null;
    }

    private UUID uuidParam(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value != null ? UUID.fromString(String.valueOf(value)) : null;
    }

    private String truncate(String message) {
        if (message == null) {
            return null;
        }
        return message.length() > 2000 ? message.substring(0, 2000) : message;
    }
}
