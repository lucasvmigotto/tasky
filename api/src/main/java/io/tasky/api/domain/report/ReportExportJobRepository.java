package io.tasky.api.domain.report;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportExportJobRepository extends JpaRepository<ReportExportJob, UUID> {
    Optional<ReportExportJob> findByIdAndOrganizationId(UUID id, UUID organizationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("""
        select j from ReportExportJob j
        where j.status = :status
        order by j.createdAt asc
        """)
    List<ReportExportJob> claimCandidates(ReportExportStatus status, Pageable pageable);
}
