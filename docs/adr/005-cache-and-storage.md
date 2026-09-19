# ADR-005: Redis for summary cache; no Mongo; MinIO-ready storage

- Context: report summary fan-out is the hottest read; session/lock
  ownership and document-store needs were asserted but unproven.
- Options: (a) Redis cache + Mongo for feed/audit, (b) minimal caching only.
- Decision: Redis caches only report summaries (30s TTL, tenant-scoped
  keys, fail-open, JSON values); no Mongo (JSONB + EXPLAIN-healthy
  indexes suffice); attachments/exports go through `FileStorageService`
  (local volume in dev, Azure/S3-compatible when configured; MinIO
  service present in compose for S3-path validation).
- Consequences: 30s summary staleness by design; Redis outage never
  degrades availability (health excluded, metrics alert).
- Revisit when: feed/audit EXPLAIN regresses, or export artifact volume
  demands object-store lifecycle rules.
