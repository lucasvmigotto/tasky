# 001 — Data model

- `refresh_sessions`: `token_hash` UQ, `family_id`, sliding `expires_at`
  (14d), absolute `family_expires_at` (30d), `revoked_at`, `replaced_by`,
  `version`, `created_ip` [OBSERVED: `V5`, `V48`, `RefreshSession.java:25-70`].
- `users`: identity keyed by `email`, `google_sub` UQ [OBSERVED: `V1`].
- No server-side access-token store (stateless JWT claims
  `sub/email/org_id/role`) [OBSERVED: `JwtTokenProvider.java:42-62`].
