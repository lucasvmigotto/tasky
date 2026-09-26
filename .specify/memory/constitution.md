# TaskY — Constitution

> Non-negotiable engineering principles. Reconstructed by
> project:introspec 2026-09-26 from observed code; every rule below is
> enforced by at least one test or DB constraint.

1. **Tenant isolation is deny-by-default.** Every query and every endpoint
   is org-scoped (`organizationId` equality on writes, scoped finders on
   reads); cross-tenant access fails closed. Negative tests are mandatory
   for new endpoints.
2. **Time is server-authoritative.** Durations, pause math, period bounds
   and overlap checks use the DB/server clock, never client timestamps.
3. **Money and hours are computed by genuine SQL.** Reporting aggregates
   with GROUP BY in the database; no in-memory folds over unbounded sets
   (report page size ≤ 500).
4. **Concurrent mutation uses optimistic locking.** `@Version` +
   `expectedVersion` → 409 on conflict; single-running-timer and
   no-overlap are additionally enforced by DB constraints (partial UQ,
   EXCLUDE), not just app checks.
5. **Auth is short-JWT + rotating refresh family.** Refresh reuse wipes
   the family (theft signal); absolute 30-day family lifetime; secrets
   never leave HttpOnly cookies / env.
6. **Cache is fail-open, never authoritative.** Redis down ⇒ slower, not
   wrong; no security decision reads from cache.
7. **Uploads are untrusted bytes.** Random prefix outside web root,
   extension + MIME + size policy, payload stripping on images.
8. **Every behavior change ships with its proof.** Backend: Testcontainers
   integration test. Frontend: vitest/MSW case. Cross-stack: Playwright
   journey. Query-count assertions guard N+1 on hot paths.
