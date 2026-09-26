package io.tasky.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OidcCodeExchangeServiceTest {

    private final RestClient.Builder builder = RestClient.builder()
            .requestFactory(new SimpleClientHttpRequestFactory());
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final RestClient restClient = builder.build();
    private final OidcCodeExchangeService service = new OidcCodeExchangeService(
            restClient, "google-id", "google-secret", "ms-id", "ms-secret", "common",
            true, "https://mock.local/tasky-google-mock/token", "https://mock.local/tasky-microsoft-mock/token");

    private static final String GOOGLE_URL = "https://oauth2.googleapis.com/token";
    private static final String MS_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

    @Test
    void google_validCode_returnsIdToken() {
        server.expect(once(), requestTo(GOOGLE_URL))
                .andRespond(withSuccess(
                        "{\"id_token\":\"google-id-token\",\"token_type\":\"Bearer\",\"expires_in\":3599}",
                        MediaType.APPLICATION_JSON));

        String idToken = service.exchangeForIdToken(
                OidcProvider.GOOGLE, "auth-code", "verifier", "http://localhost:5173/");

        assertThat(idToken).isEqualTo("google-id-token");
        server.verify();
    }

    @Test
    void microsoft_validCode_returnsIdToken() {
        server.expect(once(), requestTo(MS_URL))
                .andRespond(withSuccess(
                        "{\"id_token\":\"ms-id-token\",\"token_type\":\"Bearer\",\"expires_in\":3599}",
                        MediaType.APPLICATION_JSON));

        String idToken = service.exchangeForIdToken(
                OidcProvider.MICROSOFT, "auth-code", "verifier", "http://localhost:5173/");

        assertThat(idToken).isEqualTo("ms-id-token");
        server.verify();
    }

    @Test
    void google_providerError_rejected() {
        server.expect(once(), requestTo(GOOGLE_URL))
                .andRespond(withBadRequest()
                        .body("{\"error\":\"invalid_grant\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.exchangeForIdToken(
                OidcProvider.GOOGLE, "bad-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("code exchange failed");
        server.verify();
    }

    @Test
    void google_missingIdToken_rejected() {
        server.expect(once(), requestTo(GOOGLE_URL))
                .andRespond(withSuccess("{\"token_type\":\"Bearer\"}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.exchangeForIdToken(
                OidcProvider.GOOGLE, "auth-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("no id_token");
        server.verify();
    }

    @Test
    void mockGoogle_validCode_returnsIdToken() {
        server.expect(once(), requestTo("https://mock.local/tasky-google-mock/token"))
                .andRespond(withSuccess(
                        "{\"id_token\":\"mock-id-token\"}",
                        MediaType.APPLICATION_JSON));

        String idToken = service.exchangeForIdToken(
                OidcProvider.MOCK_GOOGLE, "mock-code", "verifier", "http://localhost:5173/");

        assertThat(idToken).isEqualTo("mock-id-token");
        server.verify();
    }

    @Test
    void mock_disabled_rejectedWithoutHttp() {
        OidcCodeExchangeService disabled = new OidcCodeExchangeService(
                restClient, "google-id", "google-secret", "ms-id", "ms-secret", "common",
                false, "https://mock.local/tasky-google-mock/token", null);

        assertThatThrownBy(() -> disabled.exchangeForIdToken(
                OidcProvider.MOCK_GOOGLE, "mock-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("disabled");
        server.verify();
    }

    @Test
    void mock_unconfiguredTenant_rejectedWithoutHttp() {
        OidcCodeExchangeService unconfigured = new OidcCodeExchangeService(
                restClient, "google-id", "google-secret", "ms-id", "ms-secret", "common",
                true, "https://mock.local/tasky-google-mock/token", null);

        assertThatThrownBy(() -> unconfigured.exchangeForIdToken(
                OidcProvider.MOCK_MICROSOFT, "mock-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("not configured");
        server.verify();
    }

    @Test
    void google_missingSecret_failsFastWithoutHttp() {
        OidcCodeExchangeService noSecret = new OidcCodeExchangeService(
                restClient, "google-id", null, "ms-id", "ms-secret", "common",
                false, null, null);

        assertThatThrownBy(() -> noSecret.exchangeForIdToken(
                OidcProvider.GOOGLE, "auth-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GOOGLE_CLIENT_SECRET");
        server.verify();
    }

    @Test
    void microsoft_missingSecret_failsFastWithoutHttp() {
        OidcCodeExchangeService noSecret = new OidcCodeExchangeService(
                restClient, "google-id", "google-secret", "ms-id", " ", "common",
                false, null, null);

        assertThatThrownBy(() -> noSecret.exchangeForIdToken(
                OidcProvider.MICROSOFT, "auth-code", "verifier", "http://localhost:5173/"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MICROSOFT_CLIENT_SECRET");
        server.verify();
    }

    @Test
    void blankCode_rejected() {
        assertThatThrownBy(() -> service.exchangeForIdToken(
                OidcProvider.GOOGLE, "  ", "verifier", "http://localhost:5173/"))
                .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }

    @Test
    void missingRedirectUri_rejected() {
        assertThatThrownBy(() -> service.exchangeForIdToken(
                OidcProvider.GOOGLE, "code", "verifier", " "))
                .isInstanceOf(IllegalArgumentException.class);
        server.verify();
    }
}
