package io.tasky.api.api;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ReportSummaryCacheIntegrationTest extends BaseIntegrationTest {

    static final GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:8-alpine"))
            .withExposedPorts(6379);

    static {
        redis.start();
    }

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private SessionFactory sessionFactory;

    private User admin;
    private Organization org;
    private String token;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        admin = userService.createUser("rc-" + uid + "@test.com", "sub-rc-" + uid, "Cache", null);
        org = organizationService.createOrganization("RC Org " + uid, "rc-org-" + uid, admin);
        token = tokenFor(admin.getId(), admin.getEmail(), org.getId(), Role.admin);
    }

    @AfterEach
    void cleanUp() {
        if (org != null) organizationRepository.delete(org);
        if (admin != null) userRepository.delete(admin);
    }

    @Test
    void repeatedSummary_servedFromCache() {
        String uri = "/api/v1/reports/summary?from=2026-01-01T00:00:00Z&to=2027-01-01T00:00:00Z";

        sessionFactory.getStatistics().clear();
        restClient.get().uri(uri)
                .header("Authorization", "Bearer " + token)
                .retrieve().toBodilessEntity();
        long firstQueries = sessionFactory.getStatistics().getQueryExecutionCount();

        sessionFactory.getStatistics().clear();
        restClient.get().uri(uri)
                .header("Authorization", "Bearer " + token)
                .retrieve().toBodilessEntity();
        long secondQueries = sessionFactory.getStatistics().getQueryExecutionCount();

        assertThat(firstQueries).isGreaterThan(0);
        // The cached call skips the 8-query summary fan-out; only per-request
        // authorization lookups (which must never be cached) still run.
        assertThat(secondQueries).as("cached summary skips the fan-out").isLessThan(firstQueries);
        assertThat(secondQueries).as("only authz queries remain").isLessThanOrEqualTo(4);
    }
}
