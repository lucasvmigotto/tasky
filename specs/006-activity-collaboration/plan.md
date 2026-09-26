# 006 — Plan (as-is)

- Backend: `ActivityCollaborationService` (457L) + `ActivityEventHelper`;
  JOIN FETCH author/user (comments) and actor/user/comment (feed) with
  Hibernate-statistics count tests (≤6/≤8 on 30-row fixtures).
- Frontend: `ActivityDetailPage` (feed, mentions, attachments via
  `uploadFile`), checklist UI.
- Data: `activity_comments`, `activity_comment_mentions`,
  `activity_attachments`, `activity_events`, `activity_checklist_items`
  (V11, V12, V21, V25).
