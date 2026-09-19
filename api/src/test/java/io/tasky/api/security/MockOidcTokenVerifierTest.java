package io.tasky.api.security;

import com.nimbusds.jose.jwk.RSAKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MockOidcTokenVerifierTest {

    private static final String GOOGLE_ISSUER = "http://localhost:48080/tasky-google-mock";
    private static final String MS_ISSUER = "http://localhost:48080/tasky-microsoft-mock";

    private RSAKey key;

    @BeforeEach
    void setUp() throws Exception {
        key = OidcTestTokens.rsaKey();
    }

    private MockOidcTokenVerifier verifier() throws Exception {
        return new MockOidcTokenVerifier(true,
                OidcTestTokens.decoderFor(key, GOOGLE_ISSUER, null),
                OidcTestTokens.decoderFor(key, MS_ISSUER, null));
    }

    @Test
    void googleMockToken_namespacedSubject() throws Exception {
        String token = OidcTestTokens.mint(key, GOOGLE_ISSUER, "any-client",
                OidcTestTokens.claims("dev.google@example.com", "Dev Google"),
                Instant.now().plusSeconds(300));

        OidcTokenPayload payload = verifier().verify(OidcProvider.MOCK_GOOGLE, token);

        assertThat(payload.email()).isEqualTo("dev.google@example.com");
        assertThat(payload.subjectKey()).isEqualTo("mock-google:subject-1");
    }

    @Test
    void microsoftMockToken_namespacedSubject() throws Exception {
        String token = OidcTestTokens.mint(key, MS_ISSUER, "any-client",
                OidcTestTokens.claims("dev.microsoft@example.com", "Dev Microsoft"),
                Instant.now().plusSeconds(300));

        OidcTokenPayload payload = verifier().verify(OidcProvider.MOCK_MICROSOFT, token);

        assertThat(payload.email()).isEqualTo("dev.microsoft@example.com");
        assertThat(payload.subjectKey()).isEqualTo("mock-microsoft:subject-1");
    }

    @Test
    void crossTenantIssuer_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, MS_ISSUER, "any-client",
                OidcTestTokens.claims("x@example.com", "X"), Instant.now().plusSeconds(300));

        assertThatThrownBy(() -> verifier().verify(OidcProvider.MOCK_GOOGLE, token))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void unverifiedEmail_rejected() throws Exception {
        Map<String, Object> claims = new HashMap<>(OidcTestTokens.claims("x@example.com", "X"));
        claims.put("email_verified", false);
        String token = OidcTestTokens.mint(key, GOOGLE_ISSUER, "any-client", claims,
                Instant.now().plusSeconds(300));

        assertThatThrownBy(() -> verifier().verify(OidcProvider.MOCK_GOOGLE, token))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    void disabledMock_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, GOOGLE_ISSUER, "any-client",
                OidcTestTokens.claims("x@example.com", "X"), Instant.now().plusSeconds(300));
        var disabled = new MockOidcTokenVerifier(false,
                OidcTestTokens.decoderFor(key, GOOGLE_ISSUER, null),
                OidcTestTokens.decoderFor(key, MS_ISSUER, null));

        assertThatThrownBy(() -> disabled.verify(OidcProvider.MOCK_GOOGLE, token))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("disabled");
    }

    @Test
    void nonMockProvider_rejected() throws Exception {
        String token = OidcTestTokens.mint(key, GOOGLE_ISSUER, "any-client",
                OidcTestTokens.claims("x@example.com", "X"), Instant.now().plusSeconds(300));

        assertThatThrownBy(() -> verifier().verify(OidcProvider.GOOGLE, token))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
