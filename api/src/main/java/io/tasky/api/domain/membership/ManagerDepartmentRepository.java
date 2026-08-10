package io.tasky.api.domain.membership;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ManagerDepartmentRepository extends JpaRepository<ManagerDepartment, ManagerDepartment.ManagerDepartmentId> {
    List<ManagerDepartment> findByMembershipId(UUID membershipId);
    boolean existsByMembershipIdAndDepartmentId(UUID membershipId, UUID departmentId);
    void deleteByMembershipId(UUID membershipId);

    @Query("select md.department.id from ManagerDepartment md where md.membership.id = :membershipId")
    List<UUID> findDepartmentIdsByMembershipId(@Param("membershipId") UUID membershipId);
}
