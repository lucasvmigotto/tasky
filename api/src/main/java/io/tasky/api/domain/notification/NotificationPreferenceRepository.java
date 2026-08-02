package io.tasky.api.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {
    List<NotificationPreference> findByMembershipId(UUID membershipId);

    @Modifying
    @Query(value = """
            INSERT INTO notification_preferences (membership_id, type, enabled)
            VALUES (:membershipId, :type, :enabled)
            ON CONFLICT (membership_id, type) DO UPDATE
            SET enabled = EXCLUDED.enabled, updated_at = now()
            """, nativeQuery = true)
    void upsert(@Param("membershipId") UUID membershipId,
                @Param("type") String type,
                @Param("enabled") boolean enabled);
}
