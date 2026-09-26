package io.tasky.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "tasky")
public record TaskYProperties(
        Jwt jwt,
        Cors cors,
        Google google,
        Microsoft microsoft,
        MockOAuth2 mockOAuth2,
        Exports exports,
        Reminders reminders,
        Platform platform
) {

    public record Jwt(
            String secret,
            long expirationHours
    ) {}

    public record Cors(
            List<String> allowedOrigins
    ) {}

    public record Google(
            String clientId,
            String clientSecret
    ) {}

    public record Microsoft(
            String clientId,
            String clientSecret,
            String tenantId
    ) {}

    public record MockOAuth2(
            boolean enabled,
            String googleIssuer,
            String microsoftIssuer,
            String googleJwksUri,
            String microsoftJwksUri
    ) {}

    public record Exports(
            long workerDelayMs
    ) {}

    public record Reminders(
            long fixedDelayMs,
            Duration dueSoonWindow,
            Duration openTimerAge,
            Duration pendingApprovalAge,
            int batchSize
    ) {}

    public record Platform(
            List<String> superAdminEmails
    ) {}
}
