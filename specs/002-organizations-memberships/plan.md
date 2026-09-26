# 002 — Plan (as-is)

- Backend: `OrganizationService`, `MembershipService` (placement,
  visibility scopes), `SuperAdminService` (ApplicationRunner).
- Frontend: `AdminMembersPage` (invite/role/settings/remove/revoke),
  `SettingsPage` (self profile), `AdminSettingsPage` (global/org keys).
- Data: `organizations`, `users`, `organization_memberships` (V1, V17,
  V22, V23, V36), `app_settings` (V38).
