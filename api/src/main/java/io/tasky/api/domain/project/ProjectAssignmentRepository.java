package io.tasky.api.domain.project;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectAssignmentRepository extends JpaRepository<ProjectAssignment, UUID> {
    List<ProjectAssignment> findByProjectId(UUID projectId);
    List<ProjectAssignment> findByMembershipId(UUID membershipId);
    Optional<ProjectAssignment> findByProjectIdAndMembershipId(UUID projectId, UUID membershipId);
    boolean existsByProjectIdAndMembershipId(UUID projectId, UUID membershipId);
}
