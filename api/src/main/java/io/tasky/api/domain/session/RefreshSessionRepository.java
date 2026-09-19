package io.tasky.api.domain.session;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, UUID> {
    Optional<RefreshSession> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSession s where s.tokenHash = :tokenHash")
    Optional<RefreshSession> findByTokenHashForUpdate(String tokenHash);

    List<RefreshSession> findByUserId(UUID userId);
    List<RefreshSession> findByFamilyId(UUID familyId);
    long countByUserIdAndRevokedAtIsNull(UUID userId);

    @Modifying
    @Query("""
        update RefreshSession s
        set s.revokedAt = CURRENT_TIMESTAMP
        where s.familyId = :familyId and s.revokedAt is null
        """)
    int revokeLiveFamily(UUID familyId);
}
