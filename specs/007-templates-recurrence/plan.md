# 007 — Plan (as-is)

- Backend: `ActivityTemplateService` (+`RecurrenceProcessor`,
  `RecurrenceSchedule`), 60s scheduler (own `tasky.recurrence.*` keys
  absent — always default).
- Data: `activity_templates`, `activity_template_versions`,
  `activity_recurrences`, `activity_recurrence_occurrences` (V18).
