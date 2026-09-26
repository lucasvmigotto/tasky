# 006 — Activity collaboration

> Status: Implemented (query-count asserted; no real-browser e2e).

## Stories

1. **Comments**: tenant-scoped thread with soft delete; author-only delete.
   - Evidence [OBSERVED: `ActivityController.java:200-244`,
     `ActivityCollaborationService.java`].
2. **Mentions**: `@`-candidates limited to activity readers; mention rows
   + `ACTIVITY_MENTION` notification gated by preference (default allow,
   deduped by event key).
   - Evidence [OBSERVED: `ActivityCollaborationService.java:214-256`,
     `NotificationService.createOnce` overload, `V47`].
3. **Feed**: activity event timeline (comment/assign/status/due changes).
   - Evidence [OBSERVED: `ActivityController.java:245-258`, `V25`].
4. **Attachments**: URL or stored-file link, audited delete.
   - Evidence [OBSERVED: `ActivityController.java:271-313`].
5. **Checklist**: items with toggle, manage-gated writes, batch counts.
   - Evidence [OBSERVED: `ActivityController.java:337-395`,
     `ActivityChecklistAggregateIntegrationTest`].

## Planned

- Rich text / threads; external channels for mentions.
