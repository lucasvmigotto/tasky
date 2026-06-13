package io.tasky.api;

import io.tasky.api.domain.membership.Role;
import io.tasky.api.security.JwtTokenProvider;
import io.tasky.api.security.SecurityUser;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class BaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @LocalServerPort
    protected int port;

    @Autowired
    protected JwtTokenProvider jwtTokenProvider;

    protected RestClient restClient;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @BeforeEach
    void setUpBase() {
        restClient = RestClient.create("http://localhost:" + port);
    }

    protected String tokenFor(UUID userId, String email, UUID orgId, Role role) {
        return jwtTokenProvider.createToken(userId, email, orgId, role);
    }

    protected SecurityUser securityUser(UUID id, UUID orgId, Role role) {
        return SecurityUser.builder()
                .id(id)
                .email("test@example.com")
                .activeOrganizationId(orgId)
                .role(role)
                .build();
    }
}
