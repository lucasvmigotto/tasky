package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ActivityChecklistItemRepository extends JpaRepository<ActivityChecklistItem, UUID> {
    List<ActivityChecklistItem> findByActivityIdOrderByPositionAsc(UUID activityId);
    long countByActivityId(UUID activityId);

    @Query("""
            select c.activity.id as activityId,
                   count(c) as total,
                   coalesce(sum(case when c.completed = true then 1 else 0 end), 0) as completed
            from ActivityChecklistItem c
            where c.activity.id in :activityIds
            group by c.activity.id
            """)
    List<ActivityChecklistCount> countChecklistByActivityIds(@Param("activityIds") Collection<UUID> activityIds);
}
