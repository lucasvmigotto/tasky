# 014 — Notifications

> Status: Implemented (30s poll JS-only; PWA push deferred by design).

## Stories

1. **Preferences**: per-type toggles `USER_MENTION` default-on (V47).
2. **Mention notify**: deduped by event key, reader-only audience.
3. **Scheduler**: 30s poll loop persists due reminders/events.
4. **Inbox**: list (20/page), unread count, mark read/all-read.
   - Evidence (all) [OBSERVED: `NotificationService` (createOnce +
     sent-message tracking + ReminderData), `NotificationController`,
     `V24`, `V47`, `NotificationCenter.tsx`].

## Planned

- Push (per PWA note in user memory): service-worker + VAPID; events
  already keyed for it (`outbox_message` + `V51` ledger pattern).
