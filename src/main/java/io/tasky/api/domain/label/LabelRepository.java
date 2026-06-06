package io.tasky.api.domain.label;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LabelRepository extends JpaRepository<Label, UUID> {
    List<Label> findByOrganizationId(UUID organizationId);
    Optional<Label> findByOrganizationIdAndSlug(UUID organizationId, String slug);
    boolean existsByOrganizationIdAndSlug(UUID organizationId, String slug);
}
