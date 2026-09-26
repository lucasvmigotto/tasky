# 010 — Capacity

> Status: Implemented (no dedicated e2e).

## Stories

1. **Schedules**: org work schedules with daily windows + default flag.
2. **Holidays**: org holiday calendar (unique org+date, yearly recurrence).
3. **Leave**: member leave periods with no-overlap EXCLUDE.
4. **Workload views**: member/sector capacity over ranges.
   - Evidence (all) [OBSERVED: `CapacityController.java:33-152`,
     `CapacityService`, `V29` incl. EXCLUDE constraints].

## Planned

- Availability/OOO surfacing in planner UI.
