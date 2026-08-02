package io.tasky.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "tasky")
public record TaskYProperties(
        Jwt jwt,
        Cors cors,
        Google google,
        Reminders reminders
) {

    public record Jwt(
            String secret,
            long expirationHours
    ) {}

    public record Cors(
            List<String> allowedOrigins
    ) {}

    public record Google(
            String clientId
    ) {}

    public record Reminders(
            long fixedDelayMs,
            Duration dueSoonWindow,
            Duration openTimerAge,
            Duration pendingApprovalAge,
            int batchSize
    ) {}
}
