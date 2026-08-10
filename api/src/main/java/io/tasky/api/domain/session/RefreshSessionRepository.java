package io.tasky.api.domain.session;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, UUID> {
    Optional<RefreshSession> findByTokenHash(String tokenHash);
    List<RefreshSession> findByUserId(UUID userId);
    List<RefreshSession> findByFamilyId(UUID familyId);
    long countByUserIdAndRevokedAtIsNull(UUID userId);
}
