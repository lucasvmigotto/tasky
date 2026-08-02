package io.tasky.api.domain.activitytemplate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityTemplateRepository extends JpaRepository<ActivityTemplate, UUID> {
    List<ActivityTemplate> findByProjectIdAndOrganizationIdOrderByNameAsc(UUID projectId, UUID organizationId);
    Optional<ActivityTemplate> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
