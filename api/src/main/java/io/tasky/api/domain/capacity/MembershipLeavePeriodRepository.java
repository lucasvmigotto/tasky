package io.tasky.api.domain.capacity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipLeavePeriodRepository extends JpaRepository<MembershipLeavePeriod, UUID> {
    Optional<MembershipLeavePeriod> findByIdAndOrganizationId(UUID id, UUID organizationId);
    List<MembershipLeavePeriod> findByOrganizationIdAndMembershipIdOrderByStartDateAsc(UUID organizationId, UUID membershipId);
    List<MembershipLeavePeriod> findByOrganizationIdAndMembershipIdInOrderByStartDateAsc(UUID organizationId, List<UUID> membershipIds);

    @Query(value = """
        SELECT lp.*
        FROM membership_leave_periods lp
        WHERE lp.membership_id = :membershipId
          AND lp.organization_id = :orgId
          AND (:editingId IS NULL OR lp.id <> :editingId)
          AND daterange(lp.start_date, COALESCE(lp.end_date + 1, DATE 'infinity'), '[)')
              && daterange(:from, COALESCE(:toExclusive, DATE 'infinity'), '[)')
        """, nativeQuery = true)
    List<MembershipLeavePeriod> findOverlapping(
            @Param("membershipId") UUID membershipId,
            @Param("orgId") UUID organizationId,
            @Param("from") LocalDate from,
            @Param("toExclusive") LocalDate toExclusive,
            @Param("editingId") UUID editingId);
}
