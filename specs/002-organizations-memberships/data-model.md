# 002 — Data model

- `organizations`: name, unique slug, timezone, workWeekStartsOn (1–7).
- `users`: email/username/google_sub unique, isActive.
- `organization_memberships`: user+org, Role, is_active, invitation
  lifecycle cols, primary_department_id, M:N `membership_member_types`,
  cost_rate, custom username, daily cap, timezone.
- `app_settings`: GLOBAL/ORGANIZATION scope, typed values.
