package io.tasky.api.domain.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentAttachmentRepository extends JpaRepository<DocumentAttachment, UUID> {

    List<DocumentAttachment> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);

    Optional<DocumentAttachment> findByIdAndDocumentId(UUID id, UUID documentId);
}
