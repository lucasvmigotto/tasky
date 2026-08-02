package io.tasky.api.domain.team;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;

public interface TeamRepository extends JpaRepository<Team, UUID> {
    List<Team> findByDepartmentId(UUID departmentId);
    List<Team> findByDepartment_Organization_Id(UUID organizationId);
    Optional<Team> findByIdAndDepartment_Organization_Id(UUID id, UUID organizationId);
    boolean existsByDepartmentIdAndName(UUID departmentId, String name);
    List<Team> findByDepartmentIdIn(Set<UUID> departmentIds);
    List<Team> findByIdInAndDepartment_Organization_Id(Set<UUID> ids, UUID organizationId);
}
