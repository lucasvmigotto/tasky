# 007 — Data model

- `activity_templates`: org + project + creator, name (UQ org/name).
- `activity_template_versions`: template FK, version no, content snapshot.
- `activity_recurrences`: template-version 1:1, frequency, interval,
  timezone, next occurrence, active flag.
- `activity_recurrence_occurrences`: recurrence FK, scheduled time,
  activity 1:1, uniqueness guards.
