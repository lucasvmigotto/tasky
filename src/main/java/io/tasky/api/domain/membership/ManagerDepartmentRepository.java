package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ManagerDepartmentRepository extends JpaRepository<ManagerDepartment, ManagerDepartment.ManagerDepartmentId> {
    List<ManagerDepartment> findByMembershipId(UUID membershipId);
    boolean existsByMembershipIdAndDepartmentId(UUID membershipId, UUID departmentId);
}
