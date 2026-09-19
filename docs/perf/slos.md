# SLOs + ownership

## Objectives (internal use)

| Signal | Objective |
|---|---|
| Common API reads p95 | < 500ms |
| Report/summary p95 | < 800ms |
| Auth availability | 99.9% monthly |
| Async export (100k rows) | READY < 30s |
| 5xx ratio | < 0.1% of requests |
| Zero cross-tenant leaks | in tests and prod |

## Error budget policy

- Breach → freeze features, work the burn-down (indexes, cache TTL,
  worker delay) until green for 7 days.
- Export SLA breach → triggers ADR-004 revisit (ShedLock/second node).

## Ownership

| Context | Owner (role) |
|---|---|
| Identity/tenancy/membership | backend / security |
| Work (projects/activities) | backend + frontend |
| Time/timesheet | backend + frontend |
| Insight (reports/exports) | backend |
| Collaboration/notifications | backend + frontend |
| Platform (compose/CI/obs) | platform |

## PR checklist (all behavior changes)

- [ ] Tenant test (cross-org → 4xx, no leak) or N/A with reason
- [ ] Scope honored in repository finder (no bare `findById` on tenant paths)
- [ ] Metric/log line added for new failure modes
- [ ] Contract in sync (DTO ↔ `types.ts` ↔ hooks ↔ MSW; `./scripts/check-openapi-contract.sh`)
- [ ] pt-BR UX strings for new user-visible states
- [ ] Migration additive (never edit applied versions)

## Required checks (enforce on `main`/`dev` in repo settings)

`api-ci` test+build, `app-ci` lint+test+e2e, `quality` backend/frontend/
secret-scan/sast/container-scan/contract-check. Branch protection cannot be
set from the repo — enable it in GitHub settings (manual step, recorded here).
