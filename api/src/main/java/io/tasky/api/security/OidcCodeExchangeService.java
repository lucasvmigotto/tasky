package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Exchanges OIDC authorization codes for {@code id_token}s at the real
 * providers' token endpoints (PKCE flow). The returned token is still
 * validated by the per-provider verifier — this service only performs
 * the code redemption step.
 */
@Component
public class OidcCodeExchangeService {

    static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final int TIMEOUT_MS = 5000;

    private final RestClient restClient;
    private final String googleClientId;
    private final String googleClientSecret;
    private final String microsoftClientId;
    private final String microsoftClientSecret;
    private final String microsoftTenant;
    private final boolean mockEnabled;
    private final String mockGoogleTokenUrl;
    private final String mockMicrosoftTokenUrl;

    @Autowired
    public OidcCodeExchangeService(TaskYProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        TaskYProperties.Google google = properties.google();
        TaskYProperties.Microsoft microsoft = properties.microsoft();
        TaskYProperties.MockOAuth2 mock = properties.mockOAuth2();
        this.restClient = RestClient.builder().requestFactory(factory).build();
        this.googleClientId = google != null ? google.clientId() : null;
        this.googleClientSecret = google != null ? google.clientSecret() : null;
        this.microsoftClientId = microsoft != null ? microsoft.clientId() : null;
        this.microsoftClientSecret = microsoft != null ? microsoft.clientSecret() : null;
        this.microsoftTenant = microsoft != null && microsoft.tenantId() != null && !microsoft.tenantId().isBlank()
                ? microsoft.tenantId()
                : "common";
        this.mockEnabled = mock != null && mock.enabled();
        this.mockGoogleTokenUrl = mock != null
                ? tokenUrl(mock.googleIssuer(), mock.googleJwksUri())
                : null;
        this.mockMicrosoftTokenUrl = mock != null
                ? tokenUrl(mock.microsoftIssuer(), mock.microsoftJwksUri())
                : null;
    }

    /**
     * Token endpoint for the mock server. Derived from the JWKS URI (same
     * origin, {@code /token} instead of {@code /jwks}) because the issuer
     * claim carries no port while the proxy serves a non-standard one.
     * Falls back to issuer + {@code /token}.
     */
    private static String tokenUrl(String issuer, String jwksUri) {
        if (jwksUri != null && jwksUri.endsWith("/jwks")) {
            return jwksUri.substring(0, jwksUri.length() - "/jwks".length()) + "/token";
        }
        if (issuer == null || issuer.isBlank()) {
            return null;
        }
        return issuer.endsWith("/") ? issuer + "token" : issuer + "/token";
    }

    OidcCodeExchangeService(RestClient restClient, String googleClientId, String googleClientSecret,
                            String microsoftClientId, String microsoftClientSecret, String microsoftTenant,
                            boolean mockEnabled, String mockGoogleTokenUrl, String mockMicrosoftTokenUrl) {
        this.restClient = restClient;
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.microsoftClientId = microsoftClientId;
        this.microsoftClientSecret = microsoftClientSecret;
        this.microsoftTenant = microsoftTenant != null && !microsoftTenant.isBlank() ? microsoftTenant : "common";
        this.mockEnabled = mockEnabled;
        this.mockGoogleTokenUrl = mockGoogleTokenUrl;
        this.mockMicrosoftTokenUrl = mockMicrosoftTokenUrl;
    }

    public String exchangeForIdToken(OidcProvider provider, String code, String codeVerifier, String redirectUri) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Authorization code is required");
        }
        if (codeVerifier == null || codeVerifier.isBlank()) {
            throw new IllegalArgumentException("PKCE code verifier is required");
        }
        if (redirectUri == null || redirectUri.isBlank()) {
            throw new IllegalArgumentException("Redirect URI is required");
        }
        return switch (provider) {
            case GOOGLE -> exchangeWithGoogle(code, codeVerifier, redirectUri);
            case MICROSOFT -> exchangeWithMicrosoft(code, codeVerifier, redirectUri);
            case MOCK_GOOGLE -> exchangeWithMock("Mock Google",
                    mockGoogleTokenUrl, code, codeVerifier, redirectUri);
            case MOCK_MICROSOFT -> exchangeWithMock("Mock Microsoft",
                    mockMicrosoftTokenUrl, code, codeVerifier, redirectUri);
        };
    }

    private String exchangeWithMock(
            String providerName, String tokenUrl, String code, String codeVerifier, String redirectUri) {
        if (!mockEnabled) {
            throw new SecurityException("Mock sign-in is disabled");
        }
        if (tokenUrl == null || tokenUrl.isBlank()) {
            throw new SecurityException("Mock sign-in is not configured for " + providerName);
        }
        // mock-oauth2-server accepts any client_id as a public client; no secret.
        MultiValueMap<String, String> form = baseForm(code, codeVerifier, redirectUri);
        form.set("client_id", "tasky-dev");
        return redeem(providerName, tokenUrl, form);
    }

    private String exchangeWithGoogle(String code, String codeVerifier, String redirectUri) {
        requireConfigured(googleClientId, googleClientSecret, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
        MultiValueMap<String, String> form = baseForm(code, codeVerifier, redirectUri);
        form.set("client_id", googleClientId);
        form.set("client_secret", googleClientSecret);
        return redeem("Google", GOOGLE_TOKEN_URL, form);
    }

    private String exchangeWithMicrosoft(String code, String codeVerifier, String redirectUri) {
        requireConfigured(microsoftClientId, microsoftClientSecret, "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET");
        MultiValueMap<String, String> form = baseForm(code, codeVerifier, redirectUri);
        form.set("client_id", microsoftClientId);
        form.set("client_secret", microsoftClientSecret);
        form.set("scope", "openid email profile");
        return redeem("Microsoft",
                "https://login.microsoftonline.com/" + microsoftTenant + "/oauth2/v2.0/token", form);
    }

    private MultiValueMap<String, String> baseForm(String code, String codeVerifier, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.set("grant_type", "authorization_code");
        form.set("code", code);
        form.set("code_verifier", codeVerifier);
        form.set("redirect_uri", redirectUri);
        return form;
    }

    private void requireConfigured(String clientId, String clientSecret, String idName, String secretName) {
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException(idName + " is not configured");
        }
        if (clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException(secretName + " is not configured");
        }
    }

    @SuppressWarnings("unchecked")
    private String redeem(String providerName, String tokenUrl, MultiValueMap<String, String> form) {
        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException | IllegalStateException e) {
            throw new SecurityException(providerName + " code exchange failed", e);
        }
        if (response == null) {
            throw new SecurityException(providerName + " code exchange failed: empty response");
        }
        Object idToken = response.get("id_token");
        if (!(idToken instanceof String token) || token.isBlank()) {
            throw new SecurityException(providerName + " code exchange failed: no id_token returned");
        }
        return token;
    }
}
