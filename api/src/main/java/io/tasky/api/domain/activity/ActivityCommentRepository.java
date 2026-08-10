package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ActivityCommentRepository extends JpaRepository<ActivityComment, UUID> {
    List<ActivityComment> findByActivityIdOrderByCreatedAtAsc(UUID activityId);
}
