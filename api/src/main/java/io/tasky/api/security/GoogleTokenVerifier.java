package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.Map;

@Component
public class GoogleTokenVerifier {

    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final String EXPECTED_ISSUERS = "accounts.google.com";
    private static final int TIMEOUT_MS = 5000;

    private final RestClient restClient;
    private final String clientId;

    @Autowired
    public GoogleTokenVerifier(TaskYProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        this.restClient = RestClient.builder().requestFactory(factory).build();
        this.clientId = properties.google() != null ? properties.google().clientId() : null;
    }

    GoogleTokenVerifier(RestClient restClient, String clientId) {
        this.restClient = restClient;
        this.clientId = clientId;
    }

    @SuppressWarnings("unchecked")
    public GoogleTokenPayload verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Google ID token is required");
        }
        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("GOOGLE_CLIENT_ID is not configured");
        }

        Map<String, Object> response;
        try {
            response = restClient.get()
                    .uri(TOKEN_INFO_URL + idToken)
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException | IllegalStateException e) {
            throw new SecurityException("Failed to verify Google ID token", e);
        }
        if (response == null) {
            throw new SecurityException("Failed to verify Google ID token: empty response");
        }

        String audience = (String) response.get("aud");
        if (!clientId.equals(audience)) {
            throw new SecurityException("Invalid Google token audience");
        }

        String issuer = (String) response.get("iss");
        if (issuer == null || !issuer.contains(EXPECTED_ISSUERS)) {
            throw new SecurityException("Invalid Google token issuer");
        }

        Object emailVerified = response.get("email_verified");
        if (!Boolean.parseBoolean(String.valueOf(emailVerified))) {
            throw new SecurityException("Google email is not verified");
        }

        String email = (String) response.get("email");
        if (email == null || email.isBlank()) {
            throw new SecurityException("Google token has no email");
        }

        validateExpiry(response.get("exp"));

        return new GoogleTokenPayload(
                (String) response.get("sub"),
                email,
                (String) response.get("name"),
                (String) response.get("picture")
        );
    }

    private void validateExpiry(Object expValue) {
        if (expValue == null) {
            return;
        }
        try {
            long expSeconds = expValue instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(expValue));
            if (Instant.ofEpochSecond(expSeconds).isBefore(Instant.now())) {
                throw new SecurityException("Google token has expired");
            }
        } catch (NumberFormatException ignored) {
            // missing/invalid exp is not a reason to accept; nothing to compare
        }
    }

    public record GoogleTokenPayload(
            String sub,
            String email,
            String name,
            String picture
    ) {}
}
