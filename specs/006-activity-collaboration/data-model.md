# 006 — Data model

- `activity_comments`: activity + author FKs, content, soft-delete flag.
- `activity_comment_mentions`: comment + mentioned membership, UQ pair.
- `activity_attachments`: activity + uploader, file metadata or storage URL.
- `activity_events`: org id, activity + actor (+comment nullable),
  event-type enum, old/new values.
- `activity_checklist_items`: activity FK, title, completed, position.
