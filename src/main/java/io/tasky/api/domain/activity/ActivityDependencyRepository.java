package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityDependencyRepository extends JpaRepository<ActivityDependency, UUID> {
    List<ActivityDependency> findByParentActivityId(UUID parentActivityId);
    List<ActivityDependency> findByChildActivityId(UUID childActivityId);
    boolean existsByParentActivityIdAndChildActivityId(UUID parentId, UUID childId);
    Optional<ActivityDependency> findByParentActivityIdAndChildActivityId(UUID parentId, UUID childId);
}
