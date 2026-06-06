package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByDepartmentId(UUID departmentId);
    List<Project> findByDepartmentOrganizationId(UUID organizationId);
    Optional<Project> findByIdAndDepartmentId(UUID id, UUID departmentId);
    boolean existsByDepartmentIdAndName(UUID departmentId, String name);
}
