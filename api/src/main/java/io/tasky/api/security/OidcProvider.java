package io.tasky.api.security;

/**
 * Identity providers accepted by {@code POST /api/v1/auth/oidc}.
 * {@code GOOGLE} keeps the legacy tokeninfo flow; {@code MICROSOFT} validates
 * Entra ID JWTs via JWKS; {@code MOCK_*} validate JWTs issued by the local
 * mock-oauth2-server (development only, gated by
 * {@code tasky.mock-oauth2.enabled}).
 */
public enum OidcProvider {
    GOOGLE,
    MICROSOFT,
    MOCK_GOOGLE,
    MOCK_MICROSOFT
}
