package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityDependencyRepository extends JpaRepository<ActivityDependency, UUID> {
    List<ActivityDependency> findByParentActivityId(UUID parentActivityId);
    List<ActivityDependency> findByChildActivityId(UUID childActivityId);
    boolean existsByParentActivityIdAndChildActivityId(UUID parentId, UUID childId);
    Optional<ActivityDependency> findByParentActivityIdAndChildActivityId(UUID parentId, UUID childId);

    @Query("""
            select d.childActivity.id as childActivityId, d.parentActivity.id as parentActivityId
            from ActivityDependency d
            where d.childActivity.id in :childIds
            """)
    List<ActivityDependencyRef> findParentRefsByChildActivityIdIn(@Param("childIds") Collection<UUID> childIds);

    @Query(value = "SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))", nativeQuery = true)
    void acquireProjectAdvisoryLock(@Param("key") String key);
}
