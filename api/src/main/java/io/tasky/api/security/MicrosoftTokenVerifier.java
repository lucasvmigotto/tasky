package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Validates Microsoft Entra ID {@code id_token} JWTs (v2.0) via JWKS:
 * signature, issuer, audience, expiry. Email falls back to
 * {@code preferred_username} (Entra does not always emit {@code email}).
 */
@Component
public class MicrosoftTokenVerifier {

    private final JwtDecoder decoder;
    private final String clientId;

    @Autowired
    public MicrosoftTokenVerifier(TaskYProperties properties) {
        TaskYProperties.Microsoft microsoft = properties.microsoft();
        String configuredClientId = microsoft != null ? microsoft.clientId() : null;
        String tenant = microsoft != null && microsoft.tenantId() != null && !microsoft.tenantId().isBlank()
                ? microsoft.tenantId()
                : "common";
        if (configuredClientId == null || configuredClientId.isBlank()) {
            this.decoder = null;
            this.clientId = null;
        } else {
            String issuer = "https://login.microsoftonline.com/" + tenant + "/v2.0";
            String jwksUri = "https://login.microsoftonline.com/" + tenant + "/discovery/v2.0/keys";
            this.decoder = buildDecoder(jwksUri, issuer, configuredClientId);
            this.clientId = configuredClientId;
        }
    }

    MicrosoftTokenVerifier(JwtDecoder decoder, String clientId) {
        this.decoder = decoder;
        this.clientId = clientId;
    }

    static NimbusJwtDecoder buildDecoder(String jwksUri, String issuer, String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
        OAuth2TokenValidator<Jwt> audienceValidator =
                new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains(audience));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), audienceValidator));
        return decoder;
    }

    public OidcTokenPayload verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Microsoft ID token is required");
        }
        if (decoder == null || clientId == null) {
            throw new SecurityException("Microsoft sign-in is not configured");
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException e) {
            throw new SecurityException("Invalid Microsoft ID token", e);
        }
        String email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("preferred_username");
        }
        if (email == null || email.isBlank()) {
            throw new SecurityException("Microsoft token has no email");
        }
        return new OidcTokenPayload(
                "ms:" + jwt.getSubject(),
                email,
                jwt.getClaimAsString("name"),
                null
        );
    }
}
