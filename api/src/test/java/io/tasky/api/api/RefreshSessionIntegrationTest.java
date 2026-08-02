package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.session.RefreshSessionRepository;
import io.tasky.api.domain.session.RefreshSessionService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RefreshSessionIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private RefreshSessionRepository sessionRepository;
    @Autowired private RefreshSessionService sessionService;

    private String uid;
    private User user;
    private Organization org;
    private String refreshCookie;

    @BeforeEach
    void setUp() {
        uid = UUID.randomUUID().toString().substring(0, 8);
        user = userService.createUser("session-" + uid + "@test.com", "sub-session-" + uid, "Session User", null);
        org = organizationService.createOrganization("Session Org " + uid, "session-org-" + uid, user);
    }

    @AfterEach
    void cleanUp() {
        if (org != null) organizationRepository.delete(org);
        if (user != null) userRepository.delete(user);
    }

    @Test
    void refresh_rotatesCookie_andReturnsNewToken() {
        String raw = sessionService.generateRawToken();
        var created = sessionService.create(user, org, "127.0.0.1");
        String oldHash = created.session().getTokenHash();

        var response = restClient.post()
                .uri("/api/v1/auth/refresh")
                .header(HttpHeaders.COOKIE, "tasky_refresh=" + created.rawToken())
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(JsonPath.<String>read(response.getBody(), "$.token")).isNotBlank();

        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).contains("tasky_refresh=");

        // old token should now be revoked (rotated)
        sessionRepository.findByTokenHash(oldHash).ifPresent(s -> {
            assertThat(s.getRevokedAt()).isNotNull();
            assertThat(s.getReplacedBy()).isNotNull();
        });
    }

    @Test
    void refresh_withReusedToken_revokesFamily() {
        var created = sessionService.create(user, org, "127.0.0.1");
        String familyId = created.session().getFamilyId().toString();

        // first rotation
        sessionService.rotate(created.rawToken(), "127.0.0.1");
        // reuse old token -> throws and revokes whole family
        assertThatThrownBy(() -> sessionService.rotate(created.rawToken(), "127.0.0.1"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("revoked");

        // all sessions in family should be revoked now
        sessionRepository.findByFamilyId(UUID.fromString(familyId))
                .forEach(s -> assertThat(s.getRevokedAt()).isNotNull());
    }

    @Test
    void logout_revokesSession() {
        var created = sessionService.create(user, org, "127.0.0.1");

        var response = restClient.post()
                .uri("/api/v1/auth/logout")
                .header(HttpHeaders.COOKIE, "tasky_refresh=" + created.rawToken())
                .retrieve()
                .toBodilessEntity();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        sessionRepository.findByTokenHash(RefreshSessionService.hash(created.rawToken()))
                .ifPresent(s -> assertThat(s.getRevokedAt()).isNotNull());
    }

    @Test
    void refresh_afterUserRemoved_returns401() {
        var created = sessionService.create(user, org, "127.0.0.1");
        userService.deactivate(user.getId());

        var response = restClient.post()
                .uri("/api/v1/auth/refresh")
                .header(HttpHeaders.COOKIE, "tasky_refresh=" + created.rawToken())
                .retrieve()
                .onStatus(s -> s.value() == 401, (req, res) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }
}
