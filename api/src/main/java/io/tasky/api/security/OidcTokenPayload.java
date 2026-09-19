package io.tasky.api.security;

/**
 * Normalized identity proof, independent of the upstream provider.
 * {@code subjectKey} is the stable user key stored by {@code UserService}:
 * raw Google {@code sub} for compatibility with the legacy {@code /google}
 * endpoint, provider-namespaced otherwise.
 */
public record OidcTokenPayload(
        String subjectKey,
        String email,
        String name,
        String picture
) {}
