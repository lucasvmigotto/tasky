package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ActivityCommentRepository extends JpaRepository<ActivityComment, UUID> {
    List<ActivityComment> findByActivityIdOrderByCreatedAtAsc(UUID activityId);

    @Query("""
        select c from ActivityComment c
        join fetch c.author a
        join fetch a.user
        where c.activity.id = :activityId
        order by c.createdAt asc
        """)
    List<ActivityComment> findByActivityIdWithAuthor(@Param("activityId") UUID activityId);
}
