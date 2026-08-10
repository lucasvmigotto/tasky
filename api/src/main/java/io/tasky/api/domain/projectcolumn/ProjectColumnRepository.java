package io.tasky.api.domain.projectcolumn;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectColumnRepository extends JpaRepository<ProjectColumn, UUID> {

    List<ProjectColumn> findByProjectIdOrderByPositionAscIdAsc(UUID projectId);

    Optional<ProjectColumn> findByProjectIdAndId(UUID projectId, UUID columnId);

    Optional<ProjectColumn> findByProjectIdAndLifecycleStatus(UUID projectId, io.tasky.api.domain.activity.ActivityStatus status);

    boolean existsByProjectIdAndPosition(UUID projectId, int position);

    boolean existsByProjectIdAndLifecycleStatus(UUID projectId, io.tasky.api.domain.activity.ActivityStatus status);

    long countByProjectId(UUID projectId);
}
