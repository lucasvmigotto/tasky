package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReportExportIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    private User admin;
    private Organization org;
    private String token;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        admin = userService.createUser("re-" + uid + "@test.com", "sub-re-" + uid, "Report Export", null);
        org = organizationService.createOrganization("RE Org " + uid, "re-org-" + uid, admin);
        token = tokenFor(admin.getId(), admin.getEmail(), org.getId(), Role.admin);
    }

    @AfterEach
    void cleanUp() {
        if (org != null) organizationRepository.delete(org);
        if (admin != null) userRepository.delete(admin);
    }

    @Test
    void postExports_createsJob() {
        double before = meterRegistry.get("tasky.exports.created").counter().count();
        String body = restClient.post()
                .uri("/api/v1/reports/exports")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"format": "csv"}
                        """)
                .retrieve()
                .body(String.class);

        assertThat(JsonPath.<String>read(body, "$.id")).isNotBlank();
        assertThat(meterRegistry.get("tasky.exports.created").counter().count())
                .isGreaterThan(before);
    }

    @Test
    void legacyGetExports_stillWorksButDeprecated() {
        var response = restClient.get()
                .uri("/api/v1/reports/exports?format=csv")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(202);
        assertThat(response.getHeaders().getFirst("Deprecation")).isEqualTo("true");
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
    }
}
