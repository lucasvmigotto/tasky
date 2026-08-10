package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectAssignmentRepository extends JpaRepository<ProjectAssignment, UUID> {
    List<ProjectAssignment> findByProjectId(UUID projectId);
    List<ProjectAssignment> findByProject_Department_Organization_Id(UUID organizationId);
    List<ProjectAssignment> findByMembershipId(UUID membershipId);
    Optional<ProjectAssignment> findByProjectIdAndMembershipId(UUID projectId, UUID membershipId);
    boolean existsByProjectIdAndMembershipId(UUID projectId, UUID membershipId);

    @Query("select pa.project.id from ProjectAssignment pa where pa.membership.id = :membershipId")
    List<UUID> findProjectIdsByMembershipId(@Param("membershipId") UUID membershipId);
}
