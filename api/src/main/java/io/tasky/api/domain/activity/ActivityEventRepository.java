package io.tasky.api.domain.activity;

import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

public interface ActivityEventRepository extends Repository<ActivityEvent, UUID> {
    ActivityEvent save(ActivityEvent event);

    List<ActivityEvent> findByOrganizationIdAndActivityIdOrderByCreatedAtDescIdDesc(
            UUID organizationId, UUID activityId, Pageable pageable);
}
