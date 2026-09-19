# Phase 10 evidence — 2026-09-19

Branch: `feat/phase-10-enterprise-readiness`.

## Deliverables

- `docs/security/rbac-matrix.md`: role × resource with endpoint, service
  check and binding test; PR rules for new endpoints.
- `docs/runbooks/{deploy,rollback,restore,oncall}.md`: copy-paste commands,
  digest re-pin, JWT rotation (HS256 window), forward-fix DB rule,
  WAL ownership trap, alert → dashboard → trace flow.
- `docs/adr/001–006`: monolith, HS256+family, time invariants, async
  export, cache/storage, dev platform. Revisit triggers recorded.
- `docs/perf/slos.md`: objectives, error-budget policy, ownership, PR
  checklist, required checks (branch protection is a manual GitHub step).
- `docs/ROADMAP_STATUS.md`: final ledger — counts refreshed (115 BE /
  41+12 FE / 47 migrations), TASK-019 corrected, platform section added.

## Final gates (this phase)

- Backend: **115/115 green** (Java 25, PG18 Testcontainers; digest-only
  image form required by Testcontainers).
- Frontend: `tsc` clean; Vitest 41 pass + the same 12 pre-existing failures
  proven on the clean tree.
- Contract: `scripts/check-openapi-contract.sh` green (6 schemas).
- k6 smoke: green (checks 100%, p95 ~1–2ms).
- Compose: `config` valid; api + app rebuilt and healthy.
- Gitleaks: only the documented test-only secret (allowlisted).

## Known remaining (not started here by design)

Refresh absolute lifetime, OIDC code-flow, 12 FE test triage, real OTLP
collector/Sentry DSN, off-host encrypted backups, axe audit, PDF/XLSX,
full pagination UI, branch protection flip. Each has an owner-side trigger
in the ADRs/SLOs above.
