# PHASE 10 — Final Enterprise Readiness

> Goal: prove the system is operable by another team without tribal knowledge.
> Size: S (1 week). No code except docs + required-check wiring.

## 1. Objectives

- RBAC matrix published and tested; runbooks (deploy/rollback/restore/oncall);
  ADRs for every structural choice; SLOs + ownership; fresh-clone proof.

## 2. Tasks

### T-RBAC — Matrix doc + test lock (P2 / S)

- Publish `docs/security/rbac-matrix.md` from §12 (role × resource with
  endpoint + service method + test name). Any new endpoint must add a row +
  negative test (PR template checkbox). Rename `isManagerOrAdmin...` /
  `canViewFinancialReports` (T-23) landed or documented as known-naming-debt
  with warning banner.
- Acceptance: matrix 100% matches code (reviewed), CI ArchUnit references it.
- DoD: TASK-006/040 evidence.

### T-RUN — Runbooks (S)

- `docs/runbooks/deploy.md` (tag → release → compose pull → flyway validate →
  health → smoke), `rollback.md` (prior `api-$V`/`app-$V` + forward-fix DB
  rule), `restore.md` (from drill T-21), `oncall.md` (alerts → dashboards →
  traces → mitigations). Each: commands copy-pasteable, expected outputs,
  escalation.
- Acceptance: second engineer deploys + rolls back staging following only docs.
- DoD: drill signed off.

### T-ADR — Decisions (S)

- ADRs: modular-monolith (not microservices), HS256+family (not RS256/sessions),
  advisory+EXCLUDE+version, async export without broker, OTel/Prom/Sentry,
  PITR without managed DB (or with — record), no Redis/Kafka (with revisit
  triggers: p95, export SLA, reminder volume).
- Format: context → options → decision → consequences → revisit-when.
- DoD: `docs/adr/` indexed.

### T-SLO — SLOs + ownership (S)

- SLOs: reads p95 <500ms, reports p95 <800ms, auth 99.9%, export <30s async;
  error budget policy; owners per context (§6 table); PR template (tenant test?
  scope honored? metric added?).
- Required checks: backend, frontend, E2E smoke, Trivy, contract-diff.
  Protected `main` + preview env.
- Acceptance: checks enforced; TASK-033 closed (green proof).
- DoD: §38 checklist all ticked; release tagged.

## 3. Risks + Rollback

Docs-only; risk is bit-rot — mitigated by required checks referencing docs.

## 4. Definition of Done

- Enterprise checklist (§38) fully green with links (test runs, drill logs,
  dashboards, ADRs); `docs/ROADMAP_STATUS.md` final update; handoff recorded.
