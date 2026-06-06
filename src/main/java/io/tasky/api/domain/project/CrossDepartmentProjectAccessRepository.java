package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CrossDepartmentProjectAccessRepository extends JpaRepository<CrossDepartmentProjectAccess, UUID> {
    List<CrossDepartmentProjectAccess> findByProjectId(UUID projectId);
    Optional<CrossDepartmentProjectAccess> findByProjectIdAndDepartmentId(UUID projectId, UUID departmentId);
    boolean existsByProjectIdAndDepartmentId(UUID projectId, UUID departmentId);
}
