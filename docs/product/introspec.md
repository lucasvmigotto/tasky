# TaskY — Introspec record

> Produced 2026-09-26 on branch `docs/introspec` (commit `799767e` + this
> file). Method: project:introspec — code-first reconstruction, no
> stakeholder interviews, dev DB never touched (ephemeral Testcontainers
> PG + one scratch Podman PG for contract generation, since removed).

## How it was reconstructed

- Backend inventory: all `api/src/main/java` controllers/services (auth,
  membership, project, activity, time, timesheet, capacity, requests,
  documents, reports, notifications, search, sector, settings, audit,
  privacy) + 52 Flyway migrations (V1–V52).
- Frontend inventory: `app/src` routes/stores/hooks + e2e specs + MSW
  handlers + demo-mode policy doc.
- Data/infra inventory: migration chain, `docker-compose.yml` (dev-only),
  `mock-oauth2-server/config.json`, storage config, `.env` handling
  (gitignored scratch, never committed).
- Contract: `contracts/openapi.yaml` generated from live springdoc on a
  dev-profile boot (122 paths / 163 ops / 135 schemas), drift-checked
  with `scripts/check-openapi-contract.sh` → 6/6 schemas OK.

## Method deviations

- No interviews: all claims grounded in code; gaps marked Planned.
- `tasks.md` omitted deliberately — no future work is scheduled.
- `specs/NNN-*/qa.md` omitted — strategy lives in
  `docs/product/test-strategy.md`; per-feature QA adds no signal yet.

## Drift vs existing docs

- `docs/ROADMAP_STATUS.md` / `docs/ANALISE_TASKY.md` describe an older
  team-sync model: `teams` + `document_shares` tables were removed in
  V37; current code uses departments + visibility enums instead.
- `springdoc` dependency is present (`api/build.gradle:40`) — earlier
  session notes claiming its removal were wrong.
- OIDC code flow: Google/Microsoft legs are stubs
  (`UnsupportedOperationException`); only mock provider completes
  `POST /auth/oidc/code`. Listed as Planned in `specs/001`.
- `tasky.recurrence.*` scheduler keys are absent from config — the
  60s recurrence schedule is always default.

## Confirmation round (open)

1. Push deferred as the merge/entity simplifications — confirm before
   merging `docs/introspec` into `dev`?
2. OIDC code-flow stubs: accept as Planned, or schedule real exchange?
3. E2E timer flows: accept gap, or add to next work batch?
4. `.env` scratch convention: keep gitignored-local, or add
   `.env.example`?
