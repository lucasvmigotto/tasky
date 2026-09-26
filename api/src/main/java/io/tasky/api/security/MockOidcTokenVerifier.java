package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Validates JWTs issued by the local mock-oauth2-server (development only).
 * Signature, issuer and expiry are enforced; audience is intentionally not
 * enforced because the mock accepts any client_id during interactive login.
 * Never enabled in production: the bean refuses to verify unless
 * {@code tasky.mock-oauth2.enabled=true}.
 */
@Component
public class MockOidcTokenVerifier {

    private final boolean enabled;
    private final JwtDecoder googleDecoder;
    private final JwtDecoder microsoftDecoder;

    @Autowired
    public MockOidcTokenVerifier(TaskYProperties properties) {
        TaskYProperties.MockOAuth2 mock = properties.mockOAuth2();
        boolean on = mock != null && mock.enabled();
        this.enabled = on;
        if (on && mock.googleIssuer() != null && mock.googleJwksUri() != null) {
            this.googleDecoder = buildDecoder(mock.googleJwksUri(), mock.googleIssuer());
        } else {
            this.googleDecoder = null;
        }
        if (on && mock.microsoftIssuer() != null && mock.microsoftJwksUri() != null) {
            this.microsoftDecoder = buildDecoder(mock.microsoftJwksUri(), mock.microsoftIssuer());
        } else {
            this.microsoftDecoder = null;
        }
    }

    MockOidcTokenVerifier(boolean enabled, JwtDecoder googleDecoder, JwtDecoder microsoftDecoder) {
        this.enabled = enabled;
        this.googleDecoder = googleDecoder;
        this.microsoftDecoder = microsoftDecoder;
    }

    static NimbusJwtDecoder buildDecoder(String jwksUri, String issuer) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }

    public OidcTokenPayload verify(OidcProvider provider, String idToken) {
        if (provider != OidcProvider.MOCK_GOOGLE && provider != OidcProvider.MOCK_MICROSOFT) {
            throw new IllegalArgumentException("Not a mock provider: " + provider);
        }
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Mock ID token is required");
        }
        if (!enabled) {
            throw new SecurityException("Mock sign-in is disabled");
        }
        JwtDecoder decoder = provider == OidcProvider.MOCK_GOOGLE ? googleDecoder : microsoftDecoder;
        if (decoder == null) {
            throw new SecurityException("Mock sign-in is not configured for " + provider);
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException e) {
            throw new SecurityException("Invalid mock ID token", e);
        }
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            // Code-flow tokens from mock-oauth2-server carry no email claim —
            // synthesize a non-routable one from sub (dev-only, mock-only).
            email = jwt.getSubject() + "@mock.invalid";
        } else {
            Object verified = jwt.getClaims().get("email_verified");
            if (!Boolean.parseBoolean(String.valueOf(verified))) {
                throw new SecurityException("Mock email is not verified");
            }
        }
        String namespace = provider == OidcProvider.MOCK_GOOGLE ? "mock-google:" : "mock-microsoft:";
        return new OidcTokenPayload(
                namespace + jwt.getSubject(),
                email,
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture")
        );
    }
}
