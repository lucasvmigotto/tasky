# 001 — Plan (as-is)

- Backend: `AuthController` + `Google/Microsoft/MockOidcTokenVerifier`
  (Nimbus JWKS) + `JwtTokenProvider` (HS256) + `RefreshSessionService`
  (check-lock-check rotation, REQUIRES_NEW bulk wipe).
- Frontend: `oidc.ts` (code flow w/ PKCE+state, implicit fallback),
  `authStore` (login/restore/switch-org, Web-Locks refresh),
  `LoginPage` (provider buttons, `from` redirect).
- Data: `refresh_sessions` (V5 + V48 absolute lifetime + `@Version`).
- Contract: `/auth/*` in `contracts/openapi.yaml` (auth section).
