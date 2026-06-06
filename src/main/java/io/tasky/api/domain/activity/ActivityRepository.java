package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findByProjectId(UUID projectId);
    List<Activity> findByAssignedToId(UUID membershipId);
    List<Activity> findByCreatedById(UUID membershipId);
    List<Activity> findByProjectIdAndAssignedToId(UUID projectId, UUID membershipId);
}
