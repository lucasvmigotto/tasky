package io.tasky.api.domain.activity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import io.tasky.api.domain.sector.SectorActivityStatusCount;
import io.tasky.api.domain.sector.SectorMemberWorkload;
import io.tasky.api.domain.notification.ReminderCandidate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;

public interface ActivityRepository extends JpaRepository<Activity, UUID>, JpaSpecificationExecutor<Activity> {
    List<Activity> findByProjectId(UUID projectId);
    List<Activity> findByAssignedToId(UUID membershipId);
    List<Activity> findByCreatedById(UUID membershipId);
    List<Activity> findByProjectIdAndAssignedToId(UUID projectId, UUID membershipId);
    List<Activity> findByProject_Department_Organization_Id(UUID organizationId);
    List<Activity> findTop20ByProject_Department_Organization_IdAndTitleContainingIgnoreCaseOrderByTitleAsc(
            UUID organizationId, String title);
    List<Activity> findByParentActivityId(UUID parentActivityId);

    Optional<Activity> findByIdAndProject_Department_Organization_Id(UUID id, UUID organizationId);

    List<Activity> findByProjectIdAndProject_Department_Organization_Id(UUID projectId, UUID organizationId);

    List<Activity> findByRequestIdAndProject_Department_Organization_IdOrderByPositionAscIdAsc(
            UUID requestId, UUID organizationId);

    @Query("""
        select a from Activity a
        join a.assignees assignee
        where assignee.id = :membershipId and a.project.id = :projectId
        """)
    List<Activity> findByProjectIdAndAssigneeMembershipId(
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId);

    @Query("""
        select a.id as activityId, assignee.id as membershipId
        from Activity a
        join a.assignees assignee
        where a.id in :activityIds
        """)
    List<ActivityAssigneeRef> findAssigneeRefsByActivityIds(@Param("activityIds") List<UUID> activityIds);

    List<Activity> findByProjectIdAndStatusOrderByPositionAscIdAsc(UUID projectId, ActivityStatus status);

    @Query("""
        select a.id from Activity a
        where a.project.id = :projectId and a.status = :status
        order by a.position asc, a.id asc
        """)
    List<UUID> findActivityIdsByProjectIdAndStatus(
            @Param("projectId") UUID projectId,
            @Param("status") ActivityStatus status);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
        UPDATE activities a
        SET position = v.position,
            version = a.version + 1
        FROM jsonb_to_recordset(CAST(:payload AS jsonb)) AS v(id uuid, position int)
        WHERE a.id = v.id
          AND a.project_id = :projectId
          AND a.status = :status
        """, nativeQuery = true)
    int reassignPositions(@Param("projectId") UUID projectId,
                          @Param("status") String status,
                          @Param("payload") String payload);

    @Query("""
        select coalesce(max(a.position), 0) from Activity a
        where a.project.id = :projectId and a.status = :status
        """)
    int maxPosition(@Param("projectId") UUID projectId, @Param("status") ActivityStatus status);

    @Query("""
        select a.status as status, count(a) as total
        from Activity a
        where a.project.id in :projectIds
        group by a.status
        """)
    List<SectorActivityStatusCount> countSectorActivitiesByStatus(@Param("projectIds") Set<UUID> projectIds);

    @Query("""
        select a.status as status, count(a) as total
        from Activity a
        where a.project.id in :projectIds and a.assignedTo.id in :membershipIds
        group by a.status
        """)
    List<SectorActivityStatusCount> countSectorActivitiesByStatusAndAssignee(
            @Param("projectIds") Set<UUID> projectIds,
            @Param("membershipIds") Set<UUID> membershipIds);

    @Query("""
        select a.assignedTo.id as membershipId, count(a) as openActivities,
               coalesce(sum(a.estimatedSeconds), 0) as estimatedSeconds
        from Activity a
        where a.project.id in :projectIds and a.assignedTo.id in :membershipIds
          and a.status not in (io.tasky.api.domain.activity.ActivityStatus.DONE,
                               io.tasky.api.domain.activity.ActivityStatus.CANCELED)
        group by a.assignedTo.id
        """)
    List<SectorMemberWorkload> summarizeSectorMemberWorkload(
            @Param("projectIds") Set<UUID> projectIds,
            @Param("membershipIds") Set<UUID> membershipIds);

    @Query("""
        select a from Activity a
        where a.project.id in :projectIds
          and a.status not in (io.tasky.api.domain.activity.ActivityStatus.DONE,
                               io.tasky.api.domain.activity.ActivityStatus.CANCELED)
        order by case when a.dueDate is null then 1 else 0 end, a.dueDate asc, a.createdAt desc
        """)
    List<Activity> findSectorQueue(@Param("projectIds") Set<UUID> projectIds, Pageable pageable);

    @Query("""
        select a from Activity a
        where a.project.id in :projectIds and a.assignedTo.id in :membershipIds
          and a.status not in (io.tasky.api.domain.activity.ActivityStatus.DONE,
                               io.tasky.api.domain.activity.ActivityStatus.CANCELED)
        order by case when a.dueDate is null then 1 else 0 end, a.dueDate asc, a.createdAt desc
        """)
    List<Activity> findSectorQueueByAssignee(
            @Param("projectIds") Set<UUID> projectIds,
            @Param("membershipIds") Set<UUID> membershipIds,
            Pageable pageable);

    @Query(value = """
        SELECT m.organization_id AS "organizationId",
               m.id AS "recipientMembershipId",
               a.id AS "resourceId",
               a.title AS "body"
        FROM activities a
        JOIN organization_memberships m ON m.id = a.assigned_to
        JOIN projects p ON p.id = a.project_id
        JOIN departments d ON d.id = p.department_id AND d.organization_id = m.organization_id
        WHERE a.due_date >= :now AND a.due_date <= :dueBefore
          AND a.status NOT IN ('DONE', 'CANCELED')
          AND m.is_active = true AND m.invitation_status = 'ACCEPTED'
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences pref
              WHERE pref.membership_id = m.id AND pref.type = 'ACTIVITY_DUE_SOON' AND pref.enabled = false
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.organization_id = m.organization_id
                AND n.recipient_membership_id = m.id
                AND n.event_key = 'reminder:ACTIVITY_DUE_SOON:' || CAST(a.id AS text)
          )
        ORDER BY a.due_date, a.id
        LIMIT :batchSize
        """, nativeQuery = true)
    List<ReminderCandidate> findDueSoonReminderCandidates(
            @Param("now") Instant now,
            @Param("dueBefore") Instant dueBefore,
            @Param("batchSize") int batchSize);

    @Query(value = """
        SELECT m.organization_id AS "organizationId",
               m.id AS "recipientMembershipId",
               a.id AS "resourceId",
               a.title AS "body"
        FROM activities a
        JOIN organization_memberships m ON m.id = a.assigned_to
        JOIN projects p ON p.id = a.project_id
        JOIN departments d ON d.id = p.department_id AND d.organization_id = m.organization_id
        WHERE a.due_date < :now
          AND a.status NOT IN ('DONE', 'CANCELED')
          AND m.is_active = true AND m.invitation_status = 'ACCEPTED'
          AND NOT EXISTS (
              SELECT 1 FROM notification_preferences pref
              WHERE pref.membership_id = m.id AND pref.type = 'ACTIVITY_OVERDUE' AND pref.enabled = false
          )
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.organization_id = m.organization_id
                AND n.recipient_membership_id = m.id
                AND n.event_key = 'reminder:ACTIVITY_OVERDUE:' || CAST(a.id AS text)
          )
        ORDER BY a.due_date, a.id
        LIMIT :batchSize
        """, nativeQuery = true)
    List<ReminderCandidate> findOverdueReminderCandidates(
            @Param("now") Instant now,
            @Param("batchSize") int batchSize);

}
