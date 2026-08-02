package io.tasky.api.domain.timeentry;

import io.tasky.api.domain.notification.ReminderCandidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID>, JpaSpecificationExecutor<TimeEntry> {
    @Query(value = "select pg_advisory_xact_lock(hashtextextended(cast(:membershipId as text), 0))", nativeQuery = true)
    Object acquireMembershipLock(@Param("membershipId") UUID membershipId);

    List<TimeEntry> findByMembershipId(UUID membershipId);
    List<TimeEntry> findByOrganizationId(UUID organizationId);
    List<TimeEntry> findByOrganizationIdAndMembershipId(UUID organizationId, UUID membershipId);
    Optional<TimeEntry> findByOrganizationIdAndId(UUID organizationId, UUID id);
    Optional<TimeEntry> findTopByMembershipIdAndEndTimeIsNullOrderByStartTimeDesc(UUID membershipId);

    @Query("""
        select e from TimeEntry e
        where e.membership.id = :membershipId
          and e.organization.id = :orgId
          and e.startTime < :newEnd
          and (e.endTime is null or e.endTime > :newStart)
          and (:editingId is null or e.id <> :editingId)
        order by e.startTime asc
        """)
    List<TimeEntry> findOverlapping(@Param("orgId") UUID orgId,
                                    @Param("membershipId") UUID membershipId,
                                    @Param("newStart") Instant newStart,
                                    @Param("newEnd") Instant newEnd,
                                     @Param("editingId") UUID editingId);

    @Query("select t.id as entryId, tag from TimeEntry t join t.tags tag where t.id in :entryIds")
    List<TimeEntryTagRef> findTagRefsByEntryIds(@Param("entryIds") Collection<UUID> entryIds);

    @Query(value = """
        SELECT e.id AS "id",
               e.organization_id AS "organizationId",
               e.membership_id AS "membershipId",
               m.user_id AS "userId",
               e.project_id AS "projectId",
               e.activity_id AS "activityId",
               e.description AS "description",
               e.start_time AS "startTime",
               e.end_time AS "endTime",
               e.duration_seconds AS "durationSeconds",
               e.paused_seconds AS "pausedSeconds",
               e.paused_at AS "pausedAt",
               e.approval_status AS "approvalStatus",
               e.submitted_at AS "submittedAt",
               e.approved_at AS "approvedAt",
               e.approved_by AS "approvedBy",
               e.rejection_comment AS "rejectionComment",
               e.billing_rate_snapshot AS "billingRateSnapshot",
               e.cost_rate_snapshot AS "costRateSnapshot",
               e.billable AS "billable",
               e.created_at AS "createdAt"
        FROM time_entries e
        JOIN organization_memberships m ON m.id = e.membership_id
        WHERE e.organization_id = :orgId
          AND e.membership_id = :membershipId
          AND (:from IS NULL OR e.end_time IS NULL OR e.end_time >= :from)
          AND (:to IS NULL OR e.start_time <= :to)
          AND (:projectId IS NULL OR e.project_id = :projectId)
        ORDER BY e.start_time DESC, e.id DESC
        """, countQuery = """
        SELECT count(*)
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.membership_id = :membershipId
          AND (:from IS NULL OR e.end_time IS NULL OR e.end_time >= :from)
          AND (:to IS NULL OR e.start_time <= :to)
          AND (:projectId IS NULL OR e.project_id = :projectId)
        """, nativeQuery = true)
    Page<TimeEntryProjection> findPageByMembership(@Param("orgId") UUID orgId,
                                                   @Param("membershipId") UUID membershipId,
                                                   @Param("from") Instant from,
                                                   @Param("to") Instant to,
                                                   @Param("projectId") UUID projectId,
                                                   Pageable pageable);

    @Query(value = """
        SELECT e.id AS "id",
               e.organization_id AS "organizationId",
               e.membership_id AS "membershipId",
               m.user_id AS "userId",
               e.project_id AS "projectId",
               e.activity_id AS "activityId",
               e.description AS "description",
               e.start_time AS "startTime",
               e.end_time AS "endTime",
               e.duration_seconds AS "durationSeconds",
               e.paused_seconds AS "pausedSeconds",
               e.paused_at AS "pausedAt",
               e.approval_status AS "approvalStatus",
               e.submitted_at AS "submittedAt",
               e.approved_at AS "approvedAt",
               e.approved_by AS "approvedBy",
               e.rejection_comment AS "rejectionComment",
               e.billing_rate_snapshot AS "billingRateSnapshot",
               e.cost_rate_snapshot AS "costRateSnapshot",
               e.billable AS "billable",
               e.created_at AS "createdAt"
        FROM time_entries e
        JOIN organization_memberships m ON m.id = e.membership_id
        WHERE e.organization_id = :orgId
          AND (:from IS NULL OR e.end_time IS NULL OR e.end_time >= :from)
          AND (:to IS NULL OR e.start_time <= :to)
        ORDER BY e.start_time DESC, e.id DESC
        """, countQuery = """
        SELECT count(*)
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND (:from IS NULL OR e.end_time IS NULL OR e.end_time >= :from)
          AND (:to IS NULL OR e.start_time <= :to)
        """, nativeQuery = true)
    Page<TimeEntryProjection> findPageForOrganization(@Param("orgId") UUID orgId,
                                                      @Param("from") Instant from,
                                                      @Param("to") Instant to,
                                                      Pageable pageable);

    @Query("""
        select case when count(e) > 0 then true else false end
        from TimeEntry e
        where e.organization.id = :orgId
          and e.membership.id = :membershipId
          and e.endTime is null
          and e.startTime >= :periodStart
          and e.startTime < :periodEnd
        """)
    boolean existsRunningInPeriod(@Param("orgId") UUID orgId,
                                  @Param("membershipId") UUID membershipId,
                                  @Param("periodStart") Instant periodStart,
                                  @Param("periodEnd") Instant periodEnd);

    @Query(value = """
        SELECT EXISTS (
            SELECT 1 FROM timesheet_periods p
            WHERE p.organization_id = :orgId
              AND p.membership_id = :membershipId
              AND p.status IN ('APPROVED', 'LOCKED')
              AND p.period_start <= :startTime
              AND p.period_end > :startTime
        )
        """, nativeQuery = true)
    boolean existsClosedOrLockedPeriodFor(@Param("orgId") UUID orgId,
                                          @Param("membershipId") UUID membershipId,
                                          @Param("startTime") Instant startTime);

    @Query(value = """
        SELECT e.organization_id AS "organizationId",
               m.id AS "recipientMembershipId",
               e.id AS "resourceId",
               COALESCE(NULLIF(e.description, ''), 'Timer sem descricao') AS "body"
        FROM time_entries e
        JOIN organization_memberships m
          ON m.id = e.membership_id AND m.organization_id = e.organization_id
        WHERE e.end_time IS NULL AND e.start_time <= :startedBefore
          AND m.is_active = true AND m.invitation_status = 'ACCEPTED'
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences pref
              WHERE pref.membership_id = m.id AND pref.type = 'OPEN_TIMER' AND pref.enabled = false
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.organization_id = e.organization_id
                AND n.recipient_membership_id = m.id
                AND n.event_key = 'reminder:OPEN_TIMER:' || CAST(e.id AS text)
          )
        ORDER BY e.start_time, e.id
        LIMIT :batchSize
        """, nativeQuery = true)
    List<ReminderCandidate> findOpenTimerReminderCandidates(
            @Param("startedBefore") Instant startedBefore,
            @Param("batchSize") int batchSize);

    @Query(value = """
        SELECT e.organization_id AS "organizationId",
               admin.id AS "recipientMembershipId",
               e.id AS "resourceId",
               COALESCE(NULLIF(e.description, ''), 'Apontamento sem descricao') AS "body"
        FROM time_entries e
        JOIN organization_memberships admin ON admin.organization_id = e.organization_id
        WHERE e.approval_status = 'SUBMITTED' AND e.submitted_at <= :submittedBefore
          AND admin.role = 'admin' AND admin.is_active = true
          AND admin.invitation_status = 'ACCEPTED'
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences pref
              WHERE pref.membership_id = admin.id
                AND pref.type = 'TIME_ENTRY_PENDING_APPROVAL' AND pref.enabled = false
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.organization_id = e.organization_id
                AND n.recipient_membership_id = admin.id
                AND n.event_key = 'reminder:TIME_ENTRY_PENDING_APPROVAL:' || CAST(e.id AS text)
          )
        ORDER BY e.submitted_at, e.id, admin.id
        LIMIT :batchSize
        """, nativeQuery = true)
    List<ReminderCandidate> findPendingApprovalReminderCandidates(
            @Param("submittedBefore") Instant submittedBefore,
            @Param("batchSize") int batchSize);

}
