# 014 — Data model

- `notifications`: membership, type enum, optional activity FK, title/body,
  read flag, event key UQ, metadata jsonb.
- `notification_preferences`: member+type UQ, enabled.
- `notification_scheduler_state` / `sent_scheduled_messages`: one-row
  progress + sent dedupe.
