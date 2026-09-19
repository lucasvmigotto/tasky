# Oncall

## Alert → dashboard → trace

1. Alert fires (see `docs/observability/prometheus-alerts.yml`):
   `TaskYHigh5xx`, `TaskYRefreshReuseBurst`, `TaskYHighLatency`.
2. Open `docs/observability/grafana-red.json` (RED + domain panels):
   correlate `http_server_requests_*` with `tasky_refresh_reused_total`,
   `tasky_overlap_rejected_total`, `tasky_exports_*`.
3. Join FE → BE → DB by `traceId`: response header `X-Request-Id`,
   `ProblemDetail.traceId`, log fields
   (`requestId/userId/orgId/durationMs`), Sentry issues (hashed e-mail).

## Common mitigations

| Signal | Likely cause | Action |
|---|---|---|
| 5xx spike | bad deploy / migration | `rollback.md` (forward-fix DB) |
| Refresh-reuse burst | token theft | revoke families (`RefreshSessionService`), rotate `JWT_SECRET` (`deploy.md`), notify users |
| p95 > 800ms | export/report load | check `tasky_exports_*`, running export jobs; summary cache TTL; EXPLAIN slow query (`docs/perf/`) |
| 409 storm on time entries | clock skew / double submit | check client clocks; overlap resolver copy already guides users |
| Cache down | Redis outage | app stays UP by design (fail-open); fix Redis, no rollback needed |

## Escalation

1. Mitigate (rollback, revoke, scale worker via `TASKY_EXPORT_WORKER_DELAY_MS`).
2. Preserve evidence: incident timestamp, traceIds, dashboard snapshot, drill log.
3. File a follow-up ticket; update the alert threshold if it was noise.
