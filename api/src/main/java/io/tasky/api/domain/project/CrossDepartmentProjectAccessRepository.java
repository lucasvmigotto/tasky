package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface CrossDepartmentProjectAccessRepository extends JpaRepository<CrossDepartmentProjectAccess, UUID> {
    List<CrossDepartmentProjectAccess> findByProjectId(UUID projectId);
    List<CrossDepartmentProjectAccess> findByProject_Department_Organization_Id(UUID organizationId);
    Optional<CrossDepartmentProjectAccess> findByProjectIdAndDepartmentId(UUID projectId, UUID departmentId);
    boolean existsByProjectIdAndDepartmentId(UUID projectId, UUID departmentId);

    @Query("select c.project.id from CrossDepartmentProjectAccess c where c.department.id in :departmentIds")
    List<UUID> findProjectIdsByDepartmentIdIn(@Param("departmentIds") Set<UUID> departmentIds);
}
