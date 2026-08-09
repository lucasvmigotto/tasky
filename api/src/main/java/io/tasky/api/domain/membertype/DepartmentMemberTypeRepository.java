package io.tasky.api.domain.membertype;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DepartmentMemberTypeRepository extends JpaRepository<DepartmentMemberType, UUID> {
    List<DepartmentMemberType> findByDepartmentIdOrderByNameAsc(UUID departmentId);
    Optional<DepartmentMemberType> findByIdAndDepartmentId(UUID id, UUID departmentId);
    boolean existsByDepartmentIdAndName(UUID departmentId, String name);
}
