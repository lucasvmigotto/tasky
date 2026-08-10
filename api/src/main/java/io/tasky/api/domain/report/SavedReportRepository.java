package io.tasky.api.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedReportRepository extends JpaRepository<SavedReport, UUID> {
    Optional<SavedReport> findByIdAndOrganizationId(UUID id, UUID organizationId);
    List<SavedReport> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    List<SavedReport> findByOrganizationIdAndOwner_IdOrderByCreatedAtDesc(UUID organizationId, UUID ownerId);
}
