package io.tasky.api.domain.activitytemplate;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityRecurrenceRepository extends JpaRepository<ActivityRecurrence, UUID> {
    Optional<ActivityRecurrence> findByTemplateVersionId(UUID versionId);

    @Query(value = "SELECT id FROM activity_recurrences WHERE active = true AND next_occurrence <= :now ORDER BY next_occurrence LIMIT 100", nativeQuery = true)
    List<UUID> findDueIds(@Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ActivityRecurrence r where r.id = :id")
    Optional<ActivityRecurrence> findByIdForUpdate(@Param("id") UUID id);

    @Query("update ActivityRecurrence r set r.active = false where r.templateVersion.template.id = :templateId and r.active = true")
    @org.springframework.data.jpa.repository.Modifying
    int deactivateForTemplate(@Param("templateId") UUID templateId);
}
