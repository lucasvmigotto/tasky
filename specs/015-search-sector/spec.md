# 015 — Search & sector overview

> Status: Implemented (no dedicated e2e).

## Stories

1. **Global search**: one query across projects/activities/requests/
   members, tenant-scoped.
2. **Workload search**: recorded vs estimated hour search surfaces.
3. **Sector dashboard**: manager-scoped queue, arrivals, workload,
   completion; employee-scoped inbox.
   - Evidence (all) [OBSERVED: `SearchController.java:32-59`,
     `SearchService`, `SectorController.java:30-56`, `SectorService`,
     `GlobalSearch.tsx`, `MySectorPage.tsx`].

## Planned

- Full-text ranking (trigram/GIN); saved searches.
