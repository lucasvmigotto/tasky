# PHASE 6 — Observability

> Goal: see failures before users report them; join FE→BE→DB by trace.
> Size: S (1 week).

## 1. Objectives

- JSON logs, Prometheus metrics, OTel traces, Sentry (FE+BE), RED dashboards,
  3 alerts. Correlation (`X-Request-Id` already present) end-to-end.

## 2. Tasks

### T-19a — JSON logs + request fields (S)

- Add `logstash-logback-encoder`, `logging.pattern.console` JSON in prod
  (`timestamp, level, logger, message, requestId, userId, orgId, traceId,
  spanId, durationMs, status`). `RequestIdFilter` already sets MDC — extend
  with user/org after auth + duration interceptor. Keep dev text logs.
- Affected: `api/build.gradle`, `logback-spring.xml` (new), filter/interceptor.
  FE: none.
- Tests: boot + `POST /auth/me` log line parses as JSON with requestId.
- Acceptance: `docker logs api | jq` works; no PII in messages (reuse
  `AuditService` masking test pattern).
- DoD: log sample committed.

### T-19b — Metrics + traces (S)

- Micrometer Prometheus (`/actuator/prometheus`, prod allow-listed to scraper
  only — keep public `denyAll` except health; expose via internal port or
  mTLS — decide, document). Custom: `http.server.requests` (default),
  `tasky.timers.started`, `tasky.overlap.rejected`, `tasky.refresh.reused`,
  `tasky.export.duration`. OTel starter (traces api→JPA→PG), sampler 10%
  default, 100% on errors.
- Affected: deps + `application-prod.yml` + Nginx (scrape route, internal
  only). FE: add `sentryVitePlugin` + `tracePropagationTargets`.
- Tests: `/prometheus` has `http_server_requests_seconds`; trace header
  `traceparent` propagates FE→BE (E2E assert).
- Acceptance: Prometheus scrapes; Jaeger/Tempo shows FE→API→DB span.
- DoD: dashboard JSON committed.

### T-19c — Sentry + dashboards + alerts (S)

- Sentry DSN via env (FE `VITE_SENTRY_DSN`, BE `SENTRY_DSN`), `tracesSampleRate`
  0.1, PII scrub (email → hash). Dashboards: RED (p50/p95, 5xx, 4xx by code),
  refresh-reuse, 409-rate, export duration, PG connections. Alerts: 5xx spike,
  family-reuse burst, p95 >800ms 10 min, PG down.
- Affected: `AppProviders` (ErrorBoundary → Sentry), `GlobalExceptionHandler`
  (fingerprint by `code`), infra (Grafana or hosted — decide, document).
- Tests: staging 500 → Sentry issue with traceId; alert dry-run.
- Acceptance: alert fires to channel on synthetic failure.
- DoD: runbook links on each alert; TASK-028 evidence.

## 3. DB/API/FE changes

API: `/prometheus` internal-only (no public contract change). FE: Sentry init
+ `sentry-trace` header (CORS `expose` already `Authorization` — add
  `sentry-trace,baggage` to `exposeHeaders` if needed + Nginx allow).

## 4. Risks + Rollback

Cardinality explosion (labels) — allow-list label values (route template, not
id). Cost (traces) — sample. Rollback: env-off switches.

## 5. Definition of Done

- FE→BE→DB trace joinable by `traceId`; RED dashboards live; 3 alerts proven
  with synthetic failure; log/mask tests green.
