package io.tasky.api.domain.storage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

    Optional<StoredFile> findByIdAndOrganizationIdAndDeletedFalse(UUID id, UUID organizationId);
}
