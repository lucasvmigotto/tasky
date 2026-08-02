package io.tasky.api.domain.timesheet;

import io.tasky.api.api.timesheet.TimesheetPeriodQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimesheetPeriodRepository extends JpaRepository<TimesheetPeriod, UUID> {

    Optional<TimesheetPeriod> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Optional<TimesheetPeriod> findByOrganizationIdAndMembershipIdAndPeriodStartAndPeriodEnd(
            UUID organizationId, UUID membershipId, Instant periodStart, Instant periodEnd);

    @Query("""
        select p from TimesheetPeriod p
        where p.organization.id = :orgId
          and p.membership.id = :membershipId
          and (:from is null or p.periodEnd > :from)
          and (:to is null or p.periodStart < :to)
        order by p.periodStart desc
        """)
    List<TimesheetPeriod> findOwn(@Param("orgId") UUID orgId,
                                  @Param("membershipId") UUID membershipId,
                                  @Param("from") Instant from,
                                  @Param("to") Instant to);

    @Query(value = """
        SELECT p.id AS "id",
               p.organization_id AS "organizationId",
               p.membership_id AS "membershipId",
               u.username AS "ownerUsername",
               COALESCE(u.display_name, u.username) AS "ownerDisplayName",
               p.period_start AS "periodStart",
               p.period_end AS "periodEnd",
               p.submitted_at AS "submittedAt",
               p.version AS "version",
               COALESCE(aggr.total_seconds, 0) AS "totalSeconds",
               COALESCE(aggr.billable_seconds, 0) AS "billableSeconds",
               COALESCE(aggr.entry_count, 0) AS "entryCount"
        FROM timesheet_periods p
        JOIN organization_memberships owner
          ON owner.id = p.membership_id AND owner.organization_id = p.organization_id
        JOIN users u ON u.id = owner.user_id
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(e.duration_seconds), 0) AS total_seconds,
                   COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.billable), 0) AS billable_seconds,
                   COUNT(*) AS entry_count
            FROM time_entries e
            WHERE e.organization_id = p.organization_id
              AND e.membership_id = p.membership_id
              AND e.start_time >= p.period_start
              AND e.start_time < p.period_end
        ) aggr ON true
        WHERE p.organization_id = :orgId
          AND p.status = 'SUBMITTED'
          AND (
              EXISTS (
                  SELECT 1 FROM organization_memberships actor
                  WHERE actor.id = :actorMembershipId AND actor.role = 'admin'
              )
              OR EXISTS (
                  SELECT 1 FROM manager_departments md
                  WHERE md.membership_id = :actorMembershipId
                    AND md.department_id = owner.primary_department_id
              )
              OR EXISTS (
                  SELECT 1 FROM leader_teams lt
                  WHERE lt.membership_id = :actorMembershipId
                    AND lt.team_id = owner.primary_team_id
              )
          )
        ORDER BY p.submitted_at ASC, p.id ASC
        """, nativeQuery = true)
    List<TimesheetPeriodQueueItem> findApprovalQueue(@Param("orgId") UUID orgId,
                                                     @Param("actorMembershipId") UUID actorMembershipId);
}
