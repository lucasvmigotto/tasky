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

## Findings round (fixed 2026-09-26, uncommitted on dev)

1. A11y violations (missing `<main>` landmark + `<h1>` on login screen;
   test raced SPA boot) → fixed: semantic `<main>`, plain `h1`,
   a11y spec waits for `main` before analyzing. 3/3 green.
2. Admin founder invisible in own sector report (dept scope only matches
   `primaryDepartmentId`) → `PermissionService` admin scope now always
   includes the actor; covered by `PermissionServiceTest`.
3. No period submit/approve UI → `PeriodBar` + `ApprovalQueue` on
   `TimesheetPage` (open/submit/reopen/close, approve/reject+comment),
   6 vitest cases, full loop in `timer.spec.ts` (3/3 green).

## Confirmation round (decided 2026-09-26)

1. Merged into `dev` — yes.
2. OIDC code-flow stubs → DELIVERED 2026-09-26
   (`OidcCodeExchangeService`, real Google/Microsoft redemption +
   mock redemption; snake_case→camelCase + S256-PKCE frontend fixes).
3. E2E timer flows → DELIVERED 2026-09-26 (`app/e2e/timer.spec.ts`,
   two-user journey, green in ~6s).
4. `.env.example` → already exists and covers all compose vars; no action.
