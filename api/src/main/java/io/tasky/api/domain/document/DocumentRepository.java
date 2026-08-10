package io.tasky.api.domain.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByOrganizationIdAndProjectIdOrderByUpdatedAtDesc(UUID organizationId, UUID projectId);

    List<Document> findByOrganizationIdAndRequestIdOrderByUpdatedAtDesc(UUID organizationId, UUID requestId);

    List<Document> findByOrganizationIdAndActivityIdOrderByUpdatedAtDesc(UUID organizationId, UUID activityId);

    Optional<Document> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
