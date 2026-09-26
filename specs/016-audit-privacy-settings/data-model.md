# 016 — Data model

- `audit_logs`: org FK, actor membership, action string, entity type/id,
  details jsonb, timestamp.
- `app_settings`: scope (GLOBAL/ORGANIZATION), key UQ-per-scope, typed
  value, actor metadata.
