# 002 — Organizations & memberships

> Status: Implemented (no dedicated e2e).

## Stories

1. **Create organization**: founder becomes admin with default settings.
   - Evidence [OBSERVED: `OrganizationController.java:26`,
     `OrganizationService`].
2. **Invite lifecycle**: invite by email+role → PENDING → ACCEPTED/
   REVOKED/EXPIRED, auto-accept on verified institutional login.
   - Evidence [OBSERVED: `MembershipController.java:34-72`, `V23`].
3. **Roles**: `super_admin > admin > manager > employee`; last-admin
   removal blocked; admin-only role changes.
   - Evidence [OBSERVED: `Role.java:3-15`, `MembershipController.java:121-140`].
4. **Member settings**: custom username, daily cap, timezone, member types.
   - Evidence [OBSERVED: `MembershipController.java:99-119`].
5. **Super-admin platform role**: promote-only from env allowlist, global
   settings management.
   - Evidence [OBSERVED: `SuperAdminService.java:27-97`,
     `SettingsController.java:34-53`].

## Planned

- SCIM/team-sync provisioning; deactivation offboarding checklist.
