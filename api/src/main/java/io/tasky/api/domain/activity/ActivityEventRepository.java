package io.tasky.api.domain.activity;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ActivityEventRepository extends Repository<ActivityEvent, UUID> {
    ActivityEvent save(ActivityEvent event);

    List<ActivityEvent> findByOrganizationIdAndActivityIdOrderByCreatedAtDescIdDesc(
            UUID organizationId, UUID activityId, Pageable pageable);

    @Query("""
        select e from ActivityEvent e
        join fetch e.actor a
        join fetch a.user
        left join fetch e.comment
        where e.organizationId = :organizationId
          and e.activity.id = :activityId
        order by e.createdAt desc, e.id desc
        """)
    List<ActivityEvent> findPageWithActor(@Param("organizationId") UUID organizationId,
                                          @Param("activityId") UUID activityId,
                                          Pageable pageable);
}
