# TaskY — Feature index

> Reconstructed by project:introspec on 2026-09-26. Statuses are
> evidence-based: **Implemented** = code path exists and backend suite is
> green (118/118); **Verified** = passing e2e covers the stories (only
> auth redirect + timesheet render today); **Partial** = Implemented plus
> missing stories listed as Planned in the feature's `spec.md`.
> No `tasks.md` — nothing is planned yet.

| # | Feature | Priority | Depends on | Frontend | Backend |
|---|---|---|---|---|---|
| 001 | authentication | P0 | — | Partial | Implemented |
| 002 | organizations-memberships | P0 | 001 | Implemented | Implemented |
| 003 | org-structure | P1 | 002 | Implemented | Implemented |
| 004 | projects | P0 | 002, 003 | Implemented | Implemented |
| 005 | activities | P0 | 004 | Implemented | Implemented |
| 006 | activity-collaboration | P1 | 005 | Implemented | Implemented |
| 007 | templates-recurrence | P2 | 005 | Implemented | Implemented |
| 008 | time-tracking | P0 | 002, 004, 005 | Partial | Implemented |
| 009 | timesheets | P1 | 008 | Partial | Implemented |
| 010 | capacity | P2 | 002 | Implemented | Implemented |
| 011 | requests | P1 | 002, 004, 005 | Implemented | Implemented |
| 012 | documents-files | P2 | 002 | Implemented | Implemented |
| 013 | reporting | P1 | 008, 009 | Implemented | Implemented |
| 014 | notifications | P2 | 002 | Implemented | Implemented |
| 015 | search-sector | P2 | 002, 004 | Implemented | Implemented |
| 016 | audit-privacy-settings | P1 | 002 | Implemented | Implemented |

Conventions: `spec.md` (stories + acceptance), `plan.md` (as-is technical
context), `data-model.md` (tables/entities), `contracts/` (per-feature
operations; canonical contract is `contracts/openapi.yaml`).
