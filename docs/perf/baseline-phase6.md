# Phase 6 evidence — 2026-09-19

Branch: `feat/phase-6-observability`.

## T-19a — logs

- `logback-spring.xml`: JSON (`prod`), text with `[req/user/org/took]`
  (`dev`/`test`). Verified live: per-request `req=<uuid>` in dev logs.
- `RequestIdFilter` is `@Order(HIGHEST_PRECEDENCE)` (wraps JWT auth),
  stamps `durationMs`; JWT filter tags `userId`/`orgId` (no PII values
  beyond IDs); all keys cleared in `finally`.

## T-19b — metrics + tracing

- `micrometer-registry-prometheus` live: `/actuator/prometheus` serves
  `http_server_requests_*` + 5 `tasky_*` counters (verified values 0.0
  at boot; export counter increment covered by integration test).
- `/actuator/prometheus` permitted for in-cluster scraping; `/actuator/**`
  otherwise denied; prod ingress must not route it (Phase 10 runbook).
- OTel bridge + OTLP endpoint env configured (10% sampling); no local
  collector in dev — spans export-attempt only. Collector/SLO wiring is a
  production task, not a dev-compose one.

## T-19c — Sentry, dashboards, alerts

- Backend: plain Sentry SDK + manual `SentryConfig` (the Boot starter's
  auto-configuration **breaks Spring Boot 4 startup** — proven by failed
  boot, then fixed); empty DSN = no-op; 500 handler forwards.
- Frontend: `@sentry/react` guarded init, e-mail hashed, ErrorBoundary
  forwards crashes; DSN plumbed through the runtime chain.
- `docs/observability/grafana-red.json` (RED + 4 domain panels, queries
  aligned to actual Prometheus names) and `prometheus-alerts.yml`
  (5xx, refresh-reuse, p95>800ms). Alert firing needs a real Prometheus;
  dry-run lands in the Phase 10 oncall runbook.

## Tests

- Backend full suite: **107 green** (new deps + metrics + Sentry init in
  context). Frontend `tsc` clean (Sentry dep added, no behavior change).
