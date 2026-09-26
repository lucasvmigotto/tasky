# ADR-001: Hardened modular monolith (no microservices)

- Context: 289-file Spring backend + React SPA, internal scale (10–100s of users).
- Options: (a) keep monolith, (b) split services per domain.
- Decision: keep the monolith; enforce module boundaries with the
  `TenantArchitectureTest` static gates and the Phase 3 service split
  (core/dependency/collaboration + facade).
- Consequences: single deployable, single Flyway chain, in-process calls.
- Revisit when: sustained p95 breach after Phase 7 measures, or a domain
  needs independent deploy cadence.
