package io.tasky.api.security;

import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MicrosoftTokenVerifierTest {

    private static final String ISSUER = "https://login.microsoftonline.com/tenant-1/v2.0";
    private static final String CLIENT_ID = "ms-client-id";

    private RSAKey key;

    @BeforeEach
    void setUp() throws Exception {
        key = OidcTestTokens.rsaKey();
    }

    private MicrosoftTokenVerifier verifier() throws Exception {
        return new MicrosoftTokenVerifier(
                OidcTestTokens.decoderFor(key, ISSUER, CLIENT_ID), CLIENT_ID);
    }

    @Test
    void validToken_acceptedWithPreferredUsernameFallback() throws Exception {
        Map<String, Object> claims = new HashMap<>();
        claims.put("preferred_username", "user@corp.com");
        claims.put("name", "Corp User");
        String token = OidcTestTokens.mint(key, ISSUER, CLIENT_ID, claims,
                Instant.now().plusSeconds(300));

        OidcTokenPayload payload = verifier().verify(token);

        assertThat(payload.email()).isEqualTo("user@corp.com");
        assertThat(payload.subjectKey()).isEqualTo("ms:subject-1");
        assertThat(payload.name()).isEqualTo("Corp User");
    }

    @Test
    void emailClaim_preferredOverUsername() throws Exception {
        Map<String, Object> claims = new HashMap<>(OidcTestTokens.claims("a@corp.com", "A"));
        claims.put("preferred_username", "other@corp.com");
        String token = OidcTestTokens.mint(key, ISSUER, CLIENT_ID, claims,
                Instant.now().plusSeconds(300));

        assertThat(verifier().verify(token).email()).isEqualTo("a@corp.com");
    }

    @Test
    void wrongAudience_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, ISSUER, "other-client",
                OidcTestTokens.claims("a@corp.com", "A"), Instant.now().plusSeconds(300));

        assertThatThrownBy(() -> verifier().verify(token)).isInstanceOf(SecurityException.class);
    }

    @Test
    void wrongIssuer_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, "https://login.microsoftonline.com/evil/v2.0",
                CLIENT_ID, OidcTestTokens.claims("a@corp.com", "A"), Instant.now().plusSeconds(300));

        assertThatThrownBy(() -> verifier().verify(token)).isInstanceOf(SecurityException.class);
    }

    @Test
    void expiredToken_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, ISSUER, CLIENT_ID,
                OidcTestTokens.claims("a@corp.com", "A"), Instant.now().minusSeconds(60));

        assertThatThrownBy(() -> verifier().verify(token)).isInstanceOf(SecurityException.class);
    }

    @Test
    void tamperedSignature_rejected() {
        assertThatThrownBy(() -> verifier().verify("not-a-jwt"))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void unconfiguredVerifier_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, ISSUER, CLIENT_ID,
                OidcTestTokens.claims("a@corp.com", "A"), Instant.now().plusSeconds(300));
        var unconfigured = new MicrosoftTokenVerifier(null, null);

        assertThatThrownBy(() -> unconfigured.verify(token)).isInstanceOf(SecurityException.class)
                .hasMessageContaining("not configured");
    }
}
