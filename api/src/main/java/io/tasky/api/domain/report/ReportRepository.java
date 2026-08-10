package io.tasky.api.domain.report;

import io.tasky.api.domain.timeentry.TimeEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface ReportRepository extends Repository<TimeEntry, UUID> {

    @Query(value = """
        SELECT
            p.id AS "projectId",
            p.name AS "projectName",
            COALESCE(a.estimated_seconds, 0) AS "estimatedSeconds",
            fe.approved_seconds AS "actualApprovedSeconds",
            fe.not_approved_seconds AS "actualNotApprovedSeconds",
            GREATEST(0, COALESCE(a.estimated_seconds, 0) - fe.approved_seconds - fe.not_approved_seconds) AS "remainingSeconds",
            CASE WHEN COALESCE(a.estimated_seconds, 0) > 0
                 THEN ROUND((fe.approved_seconds + fe.not_approved_seconds) * 100.0 / a.estimated_seconds, 1)
                 ELSE 0 END AS "progressPercent",
            p.budget_seconds AS "budgetSeconds",
            p.budget_amount AS "budgetAmount",
            fe.cost AS "cost",
            fe.revenue AS "revenue",
            (fe.revenue - fe.cost) AS "margin"
        FROM projects p
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN (
            SELECT act.project_id, COALESCE(SUM(act.estimated_seconds), 0) AS estimated_seconds
            FROM activities act
            WHERE (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
            GROUP BY act.project_id
        ) a ON a.project_id = p.id
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('APPROVED', 'LOCKED')), 0) AS approved_seconds,
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('DRAFT', 'SUBMITTED')), 0) AS not_approved_seconds,
                COALESCE(SUM(CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                             THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN e.cost_rate_snapshot IS NOT NULL
                             THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS cost
            FROM time_entries e
            WHERE e.organization_id = :orgId
              AND e.project_id = p.id
              AND e.end_time IS NOT NULL
              AND e.duration_seconds IS NOT NULL
              AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
              AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
              AND e.membership_id IN :scopeMembershipIds
        ) fe ON true
        WHERE d.organization_id = :orgId
          AND (CAST(:projectId AS UUID) IS NULL OR p.id = :projectId)
        ORDER BY p.name, p.id
        """, nativeQuery = true)
    List<ProjectFinancialProjection> findProjectFinancials(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            m.id AS "membershipId",
            COALESCE(NULLIF(u.display_name, ''), u.username) AS "memberName",
            COALESCE(a.estimated_seconds, 0) AS "estimatedSeconds",
            fe.approved_seconds AS "actualApprovedSeconds",
            fe.not_approved_seconds AS "actualNotApprovedSeconds",
            GREATEST(0, COALESCE(a.estimated_seconds, 0) - fe.approved_seconds - fe.not_approved_seconds) AS "remainingSeconds",
            CASE WHEN COALESCE(a.estimated_seconds, 0) > 0
                 THEN ROUND((fe.approved_seconds + fe.not_approved_seconds) * 100.0 / a.estimated_seconds, 1)
                 ELSE 0 END AS "progressPercent",
            fe.cost AS "cost",
            fe.revenue AS "revenue",
            (fe.revenue - fe.cost) AS "margin"
        FROM organization_memberships m
        JOIN users u ON u.id = m.user_id
        LEFT JOIN (
            SELECT act.assigned_to, COALESCE(SUM(act.estimated_seconds), 0) AS estimated_seconds
            FROM activities act
            WHERE (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
            GROUP BY act.assigned_to
        ) a ON a.assigned_to = m.id
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('APPROVED', 'LOCKED')), 0) AS approved_seconds,
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('DRAFT', 'SUBMITTED')), 0) AS not_approved_seconds,
                COALESCE(SUM(CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                             THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN e.cost_rate_snapshot IS NOT NULL
                             THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS cost
            FROM time_entries e
            WHERE e.organization_id = :orgId
              AND e.membership_id = m.id
              AND e.end_time IS NOT NULL
              AND e.duration_seconds IS NOT NULL
              AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
              AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
        ) fe ON true
        WHERE m.organization_id = :orgId
          AND m.id IN :scopeMembershipIds
          AND (CAST(:membershipId AS UUID) IS NULL OR m.id = :membershipId)
        ORDER BY m.id
        """, nativeQuery = true)
    List<MemberFinancialProjection> findMemberFinancials(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            act.id AS "activityId",
            act.title AS "activityTitle",
            COALESCE(act.estimated_seconds, 0) AS "estimatedSeconds",
            fe.approved_seconds AS "actualApprovedSeconds",
            fe.not_approved_seconds AS "actualNotApprovedSeconds",
            GREATEST(0, act.estimated_seconds - fe.approved_seconds - fe.not_approved_seconds) AS "remainingSeconds",
            CASE WHEN act.estimated_seconds > 0
                 THEN ROUND((fe.approved_seconds + fe.not_approved_seconds) * 100.0 / act.estimated_seconds, 1)
                 ELSE 0 END AS "progressPercent",
            fe.cost AS "cost",
            fe.revenue AS "revenue",
            (fe.revenue - fe.cost) AS "margin"
        FROM activities act
        JOIN projects p ON p.id = act.project_id
        JOIN departments d ON d.id = p.department_id
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('APPROVED', 'LOCKED')), 0) AS approved_seconds,
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('DRAFT', 'SUBMITTED')), 0) AS not_approved_seconds,
                COALESCE(SUM(CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                             THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN e.cost_rate_snapshot IS NOT NULL
                             THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS cost
            FROM time_entries e
            WHERE e.organization_id = :orgId
              AND e.activity_id = act.id
              AND e.end_time IS NOT NULL
              AND e.duration_seconds IS NOT NULL
              AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
              AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
              AND e.membership_id IN :scopeMembershipIds
        ) fe ON true
        WHERE d.organization_id = :orgId
          AND (CAST(:projectId AS UUID) IS NULL OR act.project_id = :projectId)
          AND act.assigned_to IN :scopeMembershipIds
        ORDER BY act.title, act.id
        """, nativeQuery = true)
    List<ActivityFinancialProjection> findActivityFinancials(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            d.id AS "departmentId",
            d.name AS "departmentName",
            COALESCE(a.estimated_seconds, 0) AS "estimatedSeconds",
            fe.approved_seconds AS "actualApprovedSeconds",
            fe.not_approved_seconds AS "actualNotApprovedSeconds",
            GREATEST(0, COALESCE(a.estimated_seconds, 0) - fe.approved_seconds - fe.not_approved_seconds) AS "remainingSeconds",
            CASE WHEN COALESCE(a.estimated_seconds, 0) > 0
                 THEN ROUND((fe.approved_seconds + fe.not_approved_seconds) * 100.0 / a.estimated_seconds, 1)
                 ELSE 0 END AS "progressPercent",
            fe.cost AS "cost",
            fe.revenue AS "revenue",
            (fe.revenue - fe.cost) AS "margin"
        FROM departments d
        LEFT JOIN (
            SELECT p.department_id, COALESCE(SUM(act.estimated_seconds), 0) AS estimated_seconds
            FROM activities act
            JOIN projects p ON p.id = act.project_id
            WHERE (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
            GROUP BY p.department_id
        ) a ON a.department_id = d.id
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('APPROVED', 'LOCKED')), 0) AS approved_seconds,
                COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.approval_status IN ('DRAFT', 'SUBMITTED')), 0) AS not_approved_seconds,
                COALESCE(SUM(CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                             THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN e.cost_rate_snapshot IS NOT NULL
                             THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS cost
            FROM time_entries e
            JOIN projects ep ON ep.id = e.project_id
            WHERE e.organization_id = :orgId
              AND ep.department_id = d.id
              AND e.end_time IS NOT NULL
              AND e.duration_seconds IS NOT NULL
              AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
              AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
              AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
              AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
              AND e.membership_id IN :scopeMembershipIds
        ) fe ON true
        WHERE d.organization_id = :orgId
          AND EXISTS (
              SELECT 1 FROM organization_memberships dm
              WHERE dm.organization_id = :orgId
                AND dm.primary_department_id = d.id
                AND dm.id IN :scopeMembershipIds
          )
        ORDER BY d.name, d.id
        """, nativeQuery = true)
    List<DepartmentFinancialProjection> findDepartmentFinancials(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            e.approval_status AS "approvalStatus",
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds",
            COUNT(*) AS "entries"
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        GROUP BY e.approval_status
        ORDER BY e.approval_status
        """, nativeQuery = true)
    List<ApprovalGroupProjection> findApprovalGrouping(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            e.billable AS "billable",
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds",
            COUNT(*) AS "entries"
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        GROUP BY e.billable
        ORDER BY e.billable
        """, nativeQuery = true)
    List<BillableGroupProjection> findBillableGrouping(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds",
            COALESCE(SUM(e.duration_seconds) FILTER (WHERE e.billable), 0) AS "billableSeconds",
            COALESCE(SUM(CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                         THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS "revenue",
            COALESCE(SUM(CASE WHEN e.cost_rate_snapshot IS NOT NULL
                         THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) END), 0) AS "cost"
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        """, nativeQuery = true)
    ReportTotalsProjection findTotals(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            COALESCE(SUM(act.estimated_seconds), 0) AS "estimatedSeconds"
        FROM activities act
        JOIN projects p ON p.id = act.project_id
        JOIN departments d ON d.id = p.department_id
        WHERE d.organization_id = :orgId
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR act.project_id = :projectId)
          AND act.assigned_to IN :scopeMembershipIds
        """, nativeQuery = true)
    EstimatedSecondsProjection findTotalEstimatedSeconds(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT COUNT(*) AS "count"
        FROM activities act
        JOIN projects p ON p.id = act.project_id
        JOIN departments d ON d.id = p.department_id
        WHERE d.organization_id = :orgId
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR act.project_id = :projectId)
          AND act.assigned_to IN :scopeMembershipIds
        """, nativeQuery = true)
    CountProjection findCountActivities(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT COUNT(DISTINCT (e.start_time AT TIME ZONE :zone)::date) AS "count"
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        """, nativeQuery = true)
    CountProjection findCountDistinctWorkDays(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds,
            @Param("zone") String zone);

    @Query(value = """
        SELECT
            (e.start_time AT TIME ZONE :zone)::date AS "day",
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds"
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND e.start_time >= :from
          AND e.start_time < :to
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        GROUP BY 1
        ORDER BY 1
        """, nativeQuery = true)
    List<DaySecondsRow> findSecondsByDay(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds,
            @Param("zone") String zone);

    @Query(value = """
        SELECT
            e.project_id AS "projectId",
            p.name AS "projectName",
            p.color AS "projectColor",
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds"
        FROM time_entries e
        JOIN projects p ON p.id = e.project_id
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        GROUP BY e.project_id, p.name, p.color
        ORDER BY p.name, e.project_id
        """, nativeQuery = true)
    List<ProjectSecondsRow> findSecondsByProject(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            e.membership_id AS "membershipId",
            COALESCE(NULLIF(u.display_name, ''), u.username) AS "memberName",
            COALESCE(SUM(e.duration_seconds), 0) AS "seconds"
        FROM time_entries e
        JOIN organization_memberships m ON m.id = e.membership_id
        JOIN users u ON u.id = m.user_id
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        GROUP BY e.membership_id, m.user_id, u.display_name, u.username
        ORDER BY e.membership_id
        """, nativeQuery = true)
    List<MemberSecondsRow> findSecondsByMember(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            act.assigned_to AS "membershipId",
            COALESCE(SUM(act.estimated_seconds), 0) AS "estimatedSeconds"
        FROM activities act
        JOIN projects p ON p.id = act.project_id
        JOIN departments d ON d.id = p.department_id
        WHERE d.organization_id = :orgId
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR act.project_id = :projectId)
          AND act.assigned_to IN :scopeMembershipIds
        GROUP BY act.assigned_to
        """, nativeQuery = true)
    List<MemberEstimatedSecondsRow> findMemberEstimatedSeconds(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            act.assigned_to AS "membershipId",
            COUNT(*) AS "activityCount"
        FROM activities act
        JOIN projects p ON p.id = act.project_id
        JOIN departments d ON d.id = p.department_id
        WHERE d.organization_id = :orgId
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.end_datetime >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR act.start_datetime < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR act.project_id = :projectId)
          AND act.assigned_to IN :scopeMembershipIds
        GROUP BY act.assigned_to
        """, nativeQuery = true)
    List<MemberActivityCountRow> findMemberActivityCount(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            e.id AS "id",
            p.name AS "projectName",
            p.color AS "projectColor",
            e.project_id AS "projectId",
            e.glpi_ticket_id AS "glpiTicketId",
            COALESCE(NULLIF(u.display_name, ''), u.username) AS "memberName",
            e.description AS "description",
            e.start_time AS "startTime",
            e.end_time AS "endTime",
            e.duration_seconds AS "durationSeconds",
            e.approval_status AS "approvalStatus",
            CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                 THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) ELSE 0 END AS "revenue",
            CASE WHEN e.cost_rate_snapshot IS NOT NULL
                 THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) ELSE 0 END AS "cost",
            e.billable AS "billable"
        FROM time_entries e
        JOIN organization_memberships m ON m.id = e.membership_id
        JOIN users u ON u.id = m.user_id
        LEFT JOIN projects p ON p.id = e.project_id
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        ORDER BY e.start_time DESC, e.id DESC
        """, nativeQuery = true)
    List<DetailedRowProjection> findDetailedRows(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds);

    @Query(value = """
        SELECT
            e.id AS "id",
            p.name AS "projectName",
            p.color AS "projectColor",
            e.project_id AS "projectId",
            e.glpi_ticket_id AS "glpiTicketId",
            COALESCE(NULLIF(u.display_name, ''), u.username) AS "memberName",
            e.description AS "description",
            e.start_time AS "startTime",
            e.end_time AS "endTime",
            e.duration_seconds AS "durationSeconds",
            e.approval_status AS "approvalStatus",
            CASE WHEN e.billable AND e.billing_rate_snapshot IS NOT NULL
                 THEN ROUND(e.billing_rate_snapshot * e.duration_seconds / 3600.0, 4) ELSE 0 END AS "revenue",
            CASE WHEN e.cost_rate_snapshot IS NOT NULL
                 THEN ROUND(e.cost_rate_snapshot * e.duration_seconds / 3600.0, 4) ELSE 0 END AS "cost",
            e.billable AS "billable"
        FROM time_entries e
        JOIN organization_memberships m ON m.id = e.membership_id
        JOIN users u ON u.id = m.user_id
        LEFT JOIN projects p ON p.id = e.project_id
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        ORDER BY e.start_time DESC, e.id DESC
        """, countQuery = """
        SELECT COUNT(*)
        FROM time_entries e
        WHERE e.organization_id = :orgId
          AND e.end_time IS NOT NULL
          AND e.duration_seconds IS NOT NULL
          AND (CAST(:from AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time >= :from)
          AND (CAST(:to AS TIMESTAMP WITH TIME ZONE) IS NULL OR e.start_time < :to)
          AND (CAST(:projectId AS UUID) IS NULL OR e.project_id = :projectId)
          AND (CAST(:membershipId AS UUID) IS NULL OR e.membership_id = :membershipId)
          AND e.membership_id IN :scopeMembershipIds
        """, nativeQuery = true)
    Page<DetailedRowProjection> findDetailedRowsPage(
            @Param("orgId") UUID orgId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("projectId") UUID projectId,
            @Param("membershipId") UUID membershipId,
            @Param("scopeMembershipIds") Set<UUID> scopeMembershipIds,
            Pageable pageable);

    interface ProjectFinancialProjection {
        UUID getProjectId();
        String getProjectName();
        long getEstimatedSeconds();
        long getActualApprovedSeconds();
        long getActualNotApprovedSeconds();
        long getRemainingSeconds();
        double getProgressPercent();
        Long getBudgetSeconds();
        BigDecimal getBudgetAmount();
        BigDecimal getCost();
        BigDecimal getRevenue();
        BigDecimal getMargin();
    }

    interface MemberFinancialProjection {
        UUID getMembershipId();
        String getMemberName();
        long getEstimatedSeconds();
        long getActualApprovedSeconds();
        long getActualNotApprovedSeconds();
        long getRemainingSeconds();
        double getProgressPercent();
        BigDecimal getCost();
        BigDecimal getRevenue();
        BigDecimal getMargin();
    }

    interface ActivityFinancialProjection {
        UUID getActivityId();
        String getActivityTitle();
        long getEstimatedSeconds();
        long getActualApprovedSeconds();
        long getActualNotApprovedSeconds();
        long getRemainingSeconds();
        double getProgressPercent();
        BigDecimal getCost();
        BigDecimal getRevenue();
        BigDecimal getMargin();
    }

    interface DepartmentFinancialProjection {
        UUID getDepartmentId();
        String getDepartmentName();
        long getEstimatedSeconds();
        long getActualApprovedSeconds();
        long getActualNotApprovedSeconds();
        long getRemainingSeconds();
        double getProgressPercent();
        BigDecimal getCost();
        BigDecimal getRevenue();
        BigDecimal getMargin();
    }

    interface ApprovalGroupProjection {
        String getApprovalStatus();
        long getSeconds();
        long getEntries();
    }

    interface BillableGroupProjection {
        boolean isBillable();
        long getSeconds();
        long getEntries();
    }

    interface ReportTotalsProjection {
        long getSeconds();
        long getBillableSeconds();
        BigDecimal getRevenue();
        BigDecimal getCost();
    }

    interface EstimatedSecondsProjection {
        long getEstimatedSeconds();
    }

    interface CountProjection {
        long getCount();
    }

    interface DaySecondsRow {
        LocalDate getDay();
        long getSeconds();
    }

    interface ProjectSecondsRow {
        UUID getProjectId();
        String getProjectName();
        String getProjectColor();
        long getSeconds();
    }

    interface MemberSecondsRow {
        UUID getMembershipId();
        String getMemberName();
        long getSeconds();
    }

    interface MemberEstimatedSecondsRow {
        UUID getMembershipId();
        long getEstimatedSeconds();
    }

    interface MemberActivityCountRow {
        UUID getMembershipId();
        long getActivityCount();
    }

    interface DetailedRowProjection {
        UUID getId();
        String getProjectName();
        String getProjectColor();
        UUID getProjectId();
        String getGlpiTicketId();
        String getMemberName();
        String getDescription();
        Instant getStartTime();
        Instant getEndTime();
        Long getDurationSeconds();
        String getApprovalStatus();
        BigDecimal getRevenue();
        BigDecimal getCost();
        boolean isBillable();
    }
}
