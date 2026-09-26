# 007 — Templates & recurrence

> Status: Implemented (scheduler idempotency under load unproven).

## Stories

1. **Templates**: snapshot an activity into a versioned template.
   - Evidence [OBSERVED: `ActivityTemplateController.java:39-55`].
2. **Instantiate**: create activities from the latest template version.
   - Evidence [OBSERVED: `ActivityTemplateController.java:55-70`].
3. **Recurrence**: idempotent scheduler generates due occurrences.
   - Evidence [OBSERVED: `ActivityRecurrenceScheduler.java:19-28`,
     `V18` tables + occurrence UQs].

## Planned

- Recurrence editing UI coverage; load-level idempotency proof.
