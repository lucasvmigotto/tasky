# ADR-004: Async exports without a broker

- Context: unbounded CSV builds blocked request threads and double-queried.
- Options: (a) Kafka/Redis queue, (b) DB job table + `@Scheduled` worker.
- Decision: `report_export_jobs` table + single-node worker claiming via
  `FOR UPDATE SKIP LOCKED`; artifacts in `StoredFile` (local today, Azure
  when configured); scope frozen in job params.
- Consequences: no new infra; multi-node needs ShedLock; export latency
  histograms arrive with the worker metrics.
- Revisit when: export SLA (>30s) breaches or a second node ships.
