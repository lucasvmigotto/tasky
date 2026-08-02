package io.tasky.api.domain.department;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    List<Department> findByOrganizationId(UUID organizationId);
    Optional<Department> findByIdAndOrganizationId(UUID id, UUID organizationId);
    boolean existsByOrganizationIdAndName(UUID organizationId, String name);
    List<Department> findByIdInAndOrganizationId(Set<UUID> ids, UUID organizationId);
}
