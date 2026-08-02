package io.tasky.api.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReportExportJobRepository extends JpaRepository<ReportExportJob, UUID> {
    Optional<ReportExportJob> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
