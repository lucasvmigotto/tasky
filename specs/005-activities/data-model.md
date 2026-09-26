# 005 — Data model

- `activities`: project FK, parent FK (self), request FK, M:N assignees
  (`activity_assignees`), title/description, Fibonacci weight, datetimes,
  status/taskType/priority enums, dueDate, position, estimates, creator,
  assignee, completedAt, version.
- `activity_dependencies`: parent + child FKs.
