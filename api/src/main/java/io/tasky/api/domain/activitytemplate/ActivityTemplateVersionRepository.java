package io.tasky.api.domain.activitytemplate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ActivityTemplateVersionRepository extends JpaRepository<ActivityTemplateVersion, UUID> {
    Optional<ActivityTemplateVersion> findTopByTemplateIdOrderByVersionNumberDesc(UUID templateId);
}
