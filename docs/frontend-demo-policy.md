# Frontend Test Data Policy

Demo mode was removed. There is no demo login, no demo user, and no
`DEMO_MODE` configuration in any environment.

The frontend uses MSW (`src/core/api/msw/handlers.ts`) as the only source
of mocks, strictly for automated tests (vitest) — never shipped as a user
facing mode.

Local development and manual testing use the real backend with either a
real OIDC provider or the local mock OIDC server (see `docker-compose.yml`
`mock-oauth2`), plus the synthetic dev dataset (see backend `DevDataSeeder`).

Timer oficial: `src/core/tracker/timeTrackerStore.ts` + endpoints `/time-entries/*`.
