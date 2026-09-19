# ADR-003: Advisory locks + EXCLUDE + @Version for time integrity

- Context: one-running-per-member, no-overlap, approval/period locks.
- Options: (a) app checks only, (b) DB constraints only, (c) layered.
- Decision: layered — `pg_advisory_xact_lock` serializes creation,
  partial unique index (one running) + `EXCLUDE` (no overlap) guarantee at
  the DB, `@Version` + `expectedVersion` guard concurrent mutation,
  approval/period FSM enforced in services. Proven by parallel tests.
- Consequences: 409s are normal control flow with pt-BR UX copy.
- Revisit when: EXCLUDE blocks a legitimate product case (policy flag first).
