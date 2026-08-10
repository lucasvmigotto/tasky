package io.tasky.api.domain.activity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ActivityCommentMentionRepository extends JpaRepository<ActivityCommentMention, UUID> {
    List<ActivityCommentMention> findByCommentIdOrderByCreatedAtAscIdAsc(UUID commentId);
    List<ActivityCommentMention> findByCommentIdInOrderByCreatedAtAscIdAsc(Collection<UUID> commentIds);
}
