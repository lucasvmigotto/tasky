package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorsConfigurationTest {

    @Test
    void productionRejectsMissingOrigins() {
        SecurityConfig config = securityConfig(List.of(), "prod");

        assertThatThrownBy(config::corsConfigurationSource)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_CORS_ALLOWED_ORIGINS");
    }

    @Test
    void productionRejectsWildcardOrigins() {
        SecurityConfig config = securityConfig(List.of("*"), "prod");

        assertThatThrownBy(config::corsConfigurationSource)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("explicit HTTP(S)");
    }

    @Test
    void productionRejectsOriginsWithPaths() {
        SecurityConfig config = securityConfig(List.of("https://tasky.example.gov.br/app"), "prod");

        assertThatThrownBy(config::corsConfigurationSource)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid CORS origin");
    }

    @Test
    void developmentUsesLocalOriginWhenConfigurationIsEmpty() {
        SecurityConfig config = securityConfig(List.of(), "dev");

        assertThat(config.corsConfigurationSource()).isNotNull();
    }

    private SecurityConfig securityConfig(List<String> origins, String profile) {
        TaskYProperties properties = new TaskYProperties(
                new TaskYProperties.Jwt("unused", 1),
                new TaskYProperties.Cors(origins),
                new TaskYProperties.Google("unused"),
                new TaskYProperties.Reminders(60_000, java.time.Duration.ofHours(24),
                        java.time.Duration.ofHours(8), java.time.Duration.ofHours(24), 100),
                new TaskYProperties.Platform(List.of()));
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profile);
        return new SecurityConfig(null, properties, environment);
    }
}
