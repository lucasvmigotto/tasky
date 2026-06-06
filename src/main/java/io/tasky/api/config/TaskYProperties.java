package io.tasky.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "tasky")
public record TaskYProperties(
        Jwt jwt,
        Cors cors
) {
    public record Jwt(
            String secret,
            long expirationHours
    ) {}

    public record Cors(
            List<String> allowedOrigins
    ) {}
}
