package io.tasky.api.security;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.TaskYApplication;
import io.tasky.api.domain.membership.Role;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = TaskYApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "tasky.cors.allowed-origins=https://tasky.example.gov.br")
@ActiveProfiles(value = {"test", "prod"}, inheritProfiles = false)
class ProductionExposureIntegrationTest extends BaseIntegrationTest {

    @Test
    void productionDisablesApiDocumentationForAuthenticatedUsers() {
        String token = tokenFor(UUID.randomUUID(), "admin@example.gov.br", UUID.randomUUID(), Role.admin);

        assertForbidden("/api-docs", token);
        assertForbidden("/swagger-ui.html", token);
        assertForbidden("/swagger-ui/index.html", token);
    }

    @Test
    void productionExposesOnlyMinimalHealthInformation() {
        restClient.get()
                .uri("/actuator/health")
                .exchange((request, response) -> {
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                    String body = new String(response.getBody().readAllBytes());
                    assertThat(body).contains("\"status\":\"UP\"").doesNotContain("components");
                    return null;
                });

        String token = tokenFor(UUID.randomUUID(), "admin@example.gov.br", UUID.randomUUID(), Role.admin);
        assertForbidden("/actuator/env", token);
        assertForbidden("/actuator/beans", token);
    }

    private void assertForbidden(String path, String token) {
        restClient.get()
                .uri(path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange((request, response) -> {
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    return null;
                });
    }
}
