# 016 — Audit, privacy & settings

> Status: Implemented (no dedicated e2e).

## Stories

1. **Audit log**: security-sensitive actions persisted (login/sessions,
   membership, timesheet lifecycle, export formats, OIDC verify,
   storage config); LGPD-scoped export.
2. **LGPD**: per-member export (membership + timesheets + reports) and
   admin delete (requires CONFIRM + audit).
   - Evidence [OBSERVED: `AuditController.java:29-48`,
     `PrivacyController.java:29-63`, `AuditLogService`].
3. **Settings tiers**: GLOBAL (super-admin), ORGANIZATION (org admin),
   USER; typed values + audit.
   - Evidence [OBSERVED: `SettingsController`, `AppSettingService`, `V38`].

## Planned

- Retention/purge policy UI; immutable (WORM) audit option.
