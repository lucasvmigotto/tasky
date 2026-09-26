# 014 — Plan (as-is)

- Backend: `NotificationService`, `NotificationScheduler` (30s),
  `EventOutboxDispatcher` (V51/V52); no WS infra.
- Frontend: bell + unread badge, 30s poll, type filter, detail deep-link.
- Data: `notifications`, `notification_preferences`,
  `notification_scheduler_state`, `sent_scheduled_messages`,
  `outbox_message` (V24, V47, V51).
