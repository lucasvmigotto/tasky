package io.tasky.api.domain.capacity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipWorkScheduleRepository extends JpaRepository<MembershipWorkSchedule, UUID> {
    List<MembershipWorkSchedule> findByOrganizationIdAndMembershipIdOrderByEffectiveFromAsc(UUID organizationId, UUID membershipId);
    Optional<MembershipWorkSchedule> findByIdAndOrganizationId(UUID id, UUID organizationId);

    @Query(value = """
        SELECT mws.*
        FROM membership_work_schedules mws
        WHERE mws.membership_id = :membershipId
          AND mws.organization_id = :orgId
          AND (:editingId IS NULL OR mws.id <> :editingId)
          AND daterange(mws.effective_from, COALESCE(mws.effective_to + 1, DATE 'infinity'), '[)')
              && daterange(:from, COALESCE(:toExclusive, DATE 'infinity'), '[)')
        """, nativeQuery = true)
    List<MembershipWorkSchedule> findOverlapping(
            @Param("membershipId") UUID membershipId,
            @Param("orgId") UUID organizationId,
            @Param("from") LocalDate from,
            @Param("toExclusive") LocalDate toExclusive,
            @Param("editingId") UUID editingId);
}
