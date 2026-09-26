# 011 — Data model

- `request_sequences`: per-org key counter.
- `internal_requests`: org, unique org+key, GLPI ref, M:N assignees,
  title/description, priority/status, requester, departments, assignee,
  due date, linked project/activity, completion timestamps.
- `request_comments`: request + author, soft-delete.
