package io.tasky.api.domain.request;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RequestCommentRepository extends JpaRepository<RequestComment, UUID> {
    List<RequestComment> findByRequestIdOrderByCreatedAtAsc(UUID requestId);
}
