package io.tasky.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "123456.apps.googleusercontent.com";

    private final RestClient.Builder builder = RestClient.builder()
            .requestFactory(new SimpleClientHttpRequestFactory());
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final RestClient restClient = builder.build();
    private final GoogleTokenVerifier verifier = new GoogleTokenVerifier(restClient, CLIENT_ID);

    private void expectTokenInfo(String idToken, String json) {
        server.expect(once(), requestTo("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
    }

    @Test
    void verify_validToken_returnsPayload() {
        expectTokenInfo("valid-token", """
                {
                  "sub": "google-sub-123",
                  "email": "user@example.com",
                  "name": "User Name",
                  "picture": "https://example.com/pic.png",
                  "aud": "%s",
                  "iss": "accounts.google.com",
                  "email_verified": "true",
                  "exp": "%d"
                }
                """.formatted(CLIENT_ID, Instant.now().plusSeconds(3600).getEpochSecond()));

        var payload = verifier.verify("valid-token");

        assertThat(payload.sub()).isEqualTo("google-sub-123");
        assertThat(payload.email()).isEqualTo("user@example.com");
        assertThat(payload.name()).isEqualTo("User Name");
        assertThat(payload.picture()).isEqualTo("https://example.com/pic.png");
        server.verify();
    }

    @Test
    void verify_wrongAudience_rejected() {
        expectTokenInfo("wrong-aud-token", """
                {
                  "sub": "google-sub-123",
                  "email": "user@example.com",
                  "name": "User",
                  "aud": "other.apps.googleusercontent.com",
                  "iss": "accounts.google.com",
                  "email_verified": "true"
                }
                """);

        assertThatThrownBy(() -> verifier.verify("wrong-aud-token"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("audience");
        server.verify();
    }

    @Test
    void verify_unverifiedEmail_rejected() {
        expectTokenInfo("unverified-token", """
                {
                  "sub": "google-sub-123",
                  "email": "user@example.com",
                  "name": "User",
                  "aud": "%s",
                  "iss": "accounts.google.com",
                  "email_verified": "false"
                }
                """.formatted(CLIENT_ID));

        assertThatThrownBy(() -> verifier.verify("unverified-token"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("verified");
        server.verify();
    }

    @Test
    void verify_expiredToken_rejected() {
        expectTokenInfo("expired-token", """
                {
                  "sub": "google-sub-123",
                  "email": "user@example.com",
                  "name": "User",
                  "aud": "%s",
                  "iss": "accounts.google.com",
                  "email_verified": "true",
                  "exp": "%d"
                }
                """.formatted(CLIENT_ID, Instant.now().minusSeconds(60).getEpochSecond()));

        assertThatThrownBy(() -> verifier.verify("expired-token"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("expired");
        server.verify();
    }

    @Test
    void verify_wrongIssuer_rejected() {
        expectTokenInfo("wrong-iss-token", """
                {
                  "sub": "google-sub-123",
                  "email": "user@example.com",
                  "name": "User",
                  "aud": "%s",
                  "iss": "evil.example.com",
                  "email_verified": "true"
                }
                """.formatted(CLIENT_ID));

        assertThatThrownBy(() -> verifier.verify("wrong-iss-token"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("issuer");
        server.verify();
    }

    @Test
    void verify_missingClientId_failsFast() {
        GoogleTokenVerifier noConfigVerifier = new GoogleTokenVerifier(restClient, null);
        assertThatThrownBy(() -> noConfigVerifier.verify("token"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_CLIENT_ID");
    }

    @Test
    void verify_blankToken_rejected() {
        assertThatThrownBy(() -> verifier.verify("  "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
