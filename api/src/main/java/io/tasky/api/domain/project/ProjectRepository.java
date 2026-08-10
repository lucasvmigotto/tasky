package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByDepartmentId(UUID departmentId);
    List<Project> findByDepartmentOrganizationId(UUID organizationId);
    Optional<Project> findByIdAndDepartmentId(UUID id, UUID departmentId);
    Optional<Project> findByIdAndDepartment_Organization_Id(UUID id, UUID organizationId);
    boolean existsByDepartmentIdAndName(UUID departmentId, String name);
    List<Project> findByDepartment_Organization_Id(UUID organizationId);
    List<Project> findTop20ByDepartment_Organization_IdAndNameContainingIgnoreCaseOrderByNameAsc(
            UUID organizationId, String name);
    List<Project> findByDepartmentIdInAndIsActiveTrue(Set<UUID> departmentIds);
    List<Project> findByDepartmentIdIn(Set<UUID> departmentIds);
    List<Project> findByManagerMembershipId(UUID membershipId);
}
