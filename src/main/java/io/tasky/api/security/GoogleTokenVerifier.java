package io.tasky.api.security;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class GoogleTokenVerifier {

    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final RestTemplate restTemplate;

    public GoogleTokenVerifier() {
        this.restTemplate = new RestTemplate();
    }

    @SuppressWarnings("unchecked")
    public GoogleTokenPayload verify(String idToken) {
        try {
            String url = TOKEN_INFO_URL + idToken;
            var response = restTemplate.getForObject(url, java.util.Map.class);

            return new GoogleTokenPayload(
                    (String) response.get("sub"),
                    (String) response.get("email"),
                    (String) response.get("name"),
                    (String) response.get("picture")
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to verify Google ID token", e);
        }
    }

    public record GoogleTokenPayload(
            String sub,
            String email,
            String name,
            String picture
    ) {}
}
