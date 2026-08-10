package io.tasky.api.domain.capacity;

import io.tasky.api.domain.capacity.CapacityProjection.Actual;
import io.tasky.api.domain.capacity.CapacityProjection.Available;
import io.tasky.api.domain.capacity.CapacityProjection.Planned;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CapacityQueryRepository extends Repository<OrganizationHoliday, UUID> {

    @Query(value = """
        WITH member_ctx AS (
            SELECT m.id AS membership_id,
                   COALESCE(NULLIF(m.timezone, ''), o.timezone, 'UTC') AS tz
            FROM organization_memberships m
            JOIN organizations o ON o.id = m.organization_id
            WHERE m.organization_id = :orgId
              AND m.is_active = true
              AND m.id = ANY(string_to_array(:memberIds, ',')::uuid[])
        ),
        member_dates AS (
            SELECT ctx.membership_id,
                   ctx.tz,
                   gd.d AS work_date
            FROM member_ctx ctx
            CROSS JOIN LATERAL generate_series(
                ((:from AT TIME ZONE ctx.tz)::date),
                ((:to AT TIME ZONE ctx.tz)::date),
                '1 day'
            ) AS gd(d)
        ),
        schedule_resolution AS (
            SELECT md.membership_id, md.tz, md.work_date,
                   COALESCE(
                       (SELECT ms.work_schedule_id
                        FROM membership_work_schedules ms
                        WHERE ms.membership_id = md.membership_id
                          AND ms.organization_id = :orgId
                          AND ms.effective_from <= md.work_date
                          AND (ms.effective_to IS NULL OR ms.effective_to >= md.work_date)
                        ORDER BY ms.effective_from DESC
                        LIMIT 1),
                       (SELECT ws.id
                        FROM work_schedules ws
                        WHERE ws.organization_id = :orgId
                          AND ws.is_default = true
                        LIMIT 1)
                   ) AS schedule_id
            FROM member_dates md
        ),
        day_intervals AS (
            SELECT sr.membership_id, sr.tz, sr.work_date,
                   CASE WHEN sr.schedule_id IS NULL
                        THEN extract(isodow from sr.work_date) BETWEEN 1 AND 5
                        ELSE COALESCE(wsd.is_work_day, false)
                   END AS is_work_day,
                   COALESCE(wsd.start_time, TIME '09:00') AS start_time,
                   COALESCE(wsd.end_time, TIME '17:00') AS end_time
            FROM schedule_resolution sr
            LEFT JOIN work_schedule_days wsd
              ON wsd.work_schedule_id = sr.schedule_id
             AND wsd.day_of_week = extract(isodow from sr.work_date)
        ),
        day_seconds AS (
            SELECT di.membership_id, di.work_date,
                   CASE WHEN di.is_work_day
                        THEN GREATEST(0, EXTRACT(EPOCH FROM (
                                LEAST(di.work_date::timestamp + di.end_time, (:to AT TIME ZONE di.tz))
                              - GREATEST(di.work_date::timestamp + di.start_time, (:from AT TIME ZONE di.tz))
                        ))::bigint)
                        ELSE 0
                   END AS work_seconds
            FROM day_intervals di
        ),
        excluded_days AS (
            SELECT ds.membership_id, ds.work_date, ds.work_seconds,
                   EXISTS (
                       SELECT 1 FROM organization_holidays oh
                       WHERE oh.organization_id = :orgId
                         AND (oh.holiday_date = ds.work_date
                              OR (oh.is_recurring_yearly
                                  AND extract(month from oh.holiday_date) = extract(month from ds.work_date)
                                  AND extract(day from oh.holiday_date) = extract(day from ds.work_date)))
                   ) OR EXISTS (
                       SELECT 1 FROM membership_leave_periods lp
                       WHERE lp.organization_id = :orgId
                         AND lp.membership_id = ds.membership_id
                         AND lp.status = 'APPROVED'
                         AND lp.start_date <= ds.work_date
                         AND lp.end_date >= ds.work_date
                   ) AS excluded
            FROM day_seconds ds
        )
        SELECT ed.membership_id AS "membershipId",
               COALESCE(SUM(CASE WHEN ed.excluded THEN 0 ELSE ed.work_seconds END), 0)::bigint AS "availableSeconds"
        FROM excluded_days ed
        GROUP BY ed.membership_id
        """, nativeQuery = true)
    List<Available> sumAvailableSeconds(
            @Param("orgId") UUID organizationId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("memberIds") String memberIds);

    @Query(value = """
        WITH open_activities AS (
            SELECT a.id AS activity_id,
                   a.assigned_to AS membership_id,
                   a.estimated_seconds AS estimated_seconds,
                   a.start_datetime AS act_start,
                   a.end_datetime AS act_end
            FROM activities a
            JOIN projects p ON p.id = a.project_id
            JOIN departments d ON d.id = p.department_id
            WHERE d.organization_id = :orgId
              AND a.assigned_to = ANY(string_to_array(:memberIds, ',')::uuid[])
              AND a.status NOT IN ('DONE', 'CANCELED')
              AND a.estimated_seconds > 0
              AND a.start_datetime < :to
              AND a.end_datetime > :from
        ),
        org_ctx AS (
            SELECT COALESCE(NULLIF(timezone, ''), 'UTC') AS tz
            FROM organizations
            WHERE id = :orgId
        ),
        activity_dates AS (
            SELECT oa.activity_id, oa.membership_id, oa.estimated_seconds, oa.act_start, oa.act_end,
                   org_tz.tz AS tz,
                   gd.d AS work_date
            FROM open_activities oa
            CROSS JOIN org_ctx org_tz
            CROSS JOIN LATERAL generate_series(
                (oa.act_start AT TIME ZONE org_tz.tz)::date,
                (oa.act_end AT TIME ZONE org_tz.tz)::date,
                '1 day'
            ) AS gd(d)
        ),
        schedule_resolution AS (
            SELECT ad.activity_id, ad.membership_id, ad.estimated_seconds, ad.act_start, ad.act_end, ad.tz, ad.work_date,
                   COALESCE(
                       (SELECT ms.work_schedule_id
                        FROM membership_work_schedules ms
                        WHERE ms.membership_id = ad.membership_id
                          AND ms.organization_id = :orgId
                          AND ms.effective_from <= ad.work_date
                          AND (ms.effective_to IS NULL OR ms.effective_to >= ad.work_date)
                        ORDER BY ms.effective_from DESC
                        LIMIT 1),
                       (SELECT ws.id
                        FROM work_schedules ws
                        WHERE ws.organization_id = :orgId
                          AND ws.is_default = true
                        LIMIT 1)
                   ) AS schedule_id
            FROM activity_dates ad
        ),
        day_intervals AS (
            SELECT sr.activity_id, sr.membership_id, sr.estimated_seconds, sr.act_start, sr.act_end, sr.tz, sr.work_date,
                   CASE WHEN sr.schedule_id IS NULL
                        THEN extract(isodow from sr.work_date) BETWEEN 1 AND 5
                        ELSE COALESCE(wsd.is_work_day, false)
                   END AS is_work_day,
                   COALESCE(wsd.start_time, TIME '09:00') AS start_time,
                   COALESCE(wsd.end_time, TIME '17:00') AS end_time
            FROM schedule_resolution sr
            LEFT JOIN work_schedule_days wsd
              ON wsd.work_schedule_id = sr.schedule_id
             AND wsd.day_of_week = extract(isodow from sr.work_date)
        ),
        day_work AS (
            SELECT di.activity_id, di.membership_id, di.estimated_seconds, di.work_date,
                   CASE WHEN di.is_work_day THEN
                       GREATEST(0, EXTRACT(EPOCH FROM (
                           LEAST(di.work_date::timestamp + di.end_time, di.act_end AT TIME ZONE di.tz)
                         - GREATEST(di.work_date::timestamp + di.start_time, di.act_start AT TIME ZONE di.tz)
                       ))::bigint)
                   ELSE 0 END AS total_seconds,
                   CASE WHEN di.is_work_day THEN
                       GREATEST(0, EXTRACT(EPOCH FROM (
                           LEAST(di.work_date::timestamp + di.end_time,
                                 LEAST(di.act_end AT TIME ZONE di.tz, (:to AT TIME ZONE di.tz)))
                         - GREATEST(di.work_date::timestamp + di.start_time,
                                    GREATEST(di.act_start AT TIME ZONE di.tz, (:from AT TIME ZONE di.tz)))
                       ))::bigint)
                   ELSE 0 END AS intersect_seconds
            FROM day_intervals di
        ),
        excluded AS (
            SELECT dw.activity_id, dw.membership_id, dw.estimated_seconds, dw.work_date,
                   dw.total_seconds, dw.intersect_seconds,
                   EXISTS (
                       SELECT 1 FROM organization_holidays oh
                       WHERE oh.organization_id = :orgId
                         AND (oh.holiday_date = dw.work_date
                              OR (oh.is_recurring_yearly
                                  AND extract(month from oh.holiday_date) = extract(month from dw.work_date)
                                  AND extract(day from oh.holiday_date) = extract(day from dw.work_date)))
                   ) OR EXISTS (
                       SELECT 1 FROM membership_leave_periods lp
                       WHERE lp.organization_id = :orgId
                         AND lp.membership_id = dw.membership_id
                         AND lp.status = 'APPROVED'
                         AND lp.start_date <= dw.work_date
                         AND lp.end_date >= dw.work_date
                   ) AS excluded
            FROM day_work dw
        ),
        activity_totals AS (
            SELECT ex.activity_id, ex.membership_id, ex.estimated_seconds,
                   SUM(CASE WHEN ex.excluded THEN 0 ELSE ex.total_seconds END) AS total_seconds,
                   SUM(CASE WHEN ex.excluded THEN 0 ELSE ex.intersect_seconds END) AS intersect_seconds
            FROM excluded ex
            GROUP BY ex.activity_id, ex.membership_id, ex.estimated_seconds
        )
        SELECT at.membership_id AS "membershipId",
               COALESCE(SUM(
                   CASE WHEN at.total_seconds > 0
                        THEN ROUND(CAST(at.estimated_seconds AS numeric) * at.intersect_seconds / at.total_seconds)
                        ELSE 0 END
               ), 0)::bigint AS "plannedSeconds"
        FROM activity_totals at
        GROUP BY at.membership_id
        """, nativeQuery = true)
    List<Planned> sumPlannedSeconds(
            @Param("orgId") UUID organizationId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("memberIds") String memberIds);

    @Query(value = """
        SELECT te.membership_id AS "membershipId",
               COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (
                   LEAST(COALESCE(te.end_time, :now), :to) - GREATEST(te.start_time, :from)
               ))::bigint)), 0)::bigint AS "actualSeconds"
        FROM time_entries te
        WHERE te.organization_id = :orgId
          AND te.membership_id = ANY(string_to_array(:memberIds, ',')::uuid[])
          AND te.start_time < :to
          AND (te.end_time IS NULL OR te.end_time > :from)
        GROUP BY te.membership_id
        """, nativeQuery = true)
    List<Actual> sumActualSeconds(
            @Param("orgId") UUID organizationId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("now") Instant now,
            @Param("memberIds") String memberIds);
}
