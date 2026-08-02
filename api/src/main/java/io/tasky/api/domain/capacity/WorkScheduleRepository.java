package io.tasky.api.domain.capacity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, UUID> {
    Optional<WorkSchedule> findByIdAndOrganizationId(UUID id, UUID organizationId);
    List<WorkSchedule> findByOrganizationIdOrderByIsDefaultDescNameAsc(UUID organizationId);
    boolean existsByOrganizationIdAndName(UUID organizationId, String name);

    @Modifying
    @Query("update WorkSchedule ws set ws.isDefault = false where ws.organization.id = :orgId and ws.isDefault = true")
    void clearDefault(@Param("orgId") UUID organizationId);
}
