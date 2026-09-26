# 001 — Authentication

> Status: Partial (backend Implemented; e2e covers redirect/button stories only).

## Stories

1. **Google login**: as a user I sign in with Google and land back in the app.
   - Accept: `POST /auth/google {idToken}` validates aud/iss/expiry/verified
     email and returns app JWT + `tasky_refresh` cookie.
   - Evidence [OBSERVED: `api/.../auth/AuthController.java:55-63`,
     `GoogleTokenVerifier.java:59-77`; e2e login button render
     `app/e2e/auth.spec.ts:16-27`].
2. **Microsoft / mock OIDC login**: same via Entra v2 JWKS or local mock
   tenants (`MOCK_GOOGLE`, `MOCK_MICROSOFT`).
   - Accept: `POST /auth/oidc {provider,idToken}` validates per-provider;
     mock refused unless explicitly enabled.
   - Evidence [OBSERVED: `AuthController.java:65-81`,
     `MicrosoftTokenVerifier.java:51-86`, `MockOidcTokenVerifier.java:55-90`].
3. **Code flow**: `POST /auth/oidc/code` redeems the code at the
   provider token endpoint (PKCE, S256) and verifies the returned
   `id_token` with the existing per-provider verifier; mock tenants
   redeem at mock-oauth2-server and accept its claimless code-flow
   tokens via a `@mock.invalid` synthesized address (dev-only).
   - Evidence [OBSERVED: `OidcCodeExchangeService.java`,
     `AuthController.java` code branch, 11 exchange unit tests +
     mock-fallback test, `app/e2e/timer.spec.ts` mock login].
4. **Session**: short JWT in memory, rotating opaque refresh family in
   HttpOnly cookie; reuse wipes the family; 30-day absolute lifetime.
   - Evidence [OBSERVED: `RefreshSessionService.java:64-127`, 7 passing
     integration tests].
5. **Org switch / logout / me**: re-scoped JWT, single-session revoke,
   identity echo [OBSERVED: `AuthController.java:176-259`].

## Planned (missing stories)

- Absolute-lifetime UX (re-login prompt before family expiry).
