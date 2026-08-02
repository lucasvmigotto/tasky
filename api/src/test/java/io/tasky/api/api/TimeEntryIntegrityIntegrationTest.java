package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TimeEntryIntegrityIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private TimeEntryRepository timeEntryRepository;

    private String uid;
    private User user;
    private Organization org;
    private OrganizationMembership membership;
    private String token;

    @BeforeEach
    void setUp() {
        uid = UUID.randomUUID().toString().substring(0, 8);
        user = userService.createUser("te-" + uid + "@test.com", "sub-te-" + uid, "Time Entry", null);
        org = organizationService.createOrganization("TE Org " + uid, "te-org-" + uid, user);
        membership = membershipRepository.findByUserIdAndOrganizationId(user.getId(), org.getId()).orElseThrow();
        token = tokenFor(user.getId(), user.getEmail(), org.getId(), io.tasky.api.domain.membership.Role.admin);
    }

    @AfterEach
    void cleanUp() {
        timeEntryRepository.deleteAll(timeEntryRepository.findByOrganizationId(org.getId()));
        if (org != null) organizationRepository.delete(org);
        if (user != null) userRepository.delete(user);
    }

    @Test
    void startTimer_createsRunningEntry() {
        var response = restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "Implement feature", "billable": true}
                        """)
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(JsonPath.<String>read(response.getBody(), "$.endTime")).isNull();
    }

    @Test
    void startSecondTimer_returns409() {
        restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "First"}
                        """)
                .retrieve()
                .toBodilessEntity();

        var response = restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "Second"}
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 409, (req, res) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void manualEntry_updateOverlap_returns409() {
        // First finalized entry via manual endpoint
        String first = restClient.post()
                .uri("/api/v1/time-entries/manual")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "startTime": "2026-01-01T08:00:00Z",
                          "endTime": "2026-01-01T09:00:00Z",
                          "description": "First"
                        }
                        """)
                .retrieve()
                .body(String.class);
        String firstId = JsonPath.read(first, "$.id");

        // Second finalized entry in a non-overlapping window
        String second = restClient.post()
                .uri("/api/v1/time-entries/manual")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "startTime": "2026-01-02T08:00:00Z",
                          "endTime": "2026-01-02T09:00:00Z",
                          "description": "Second"
                        }
                        """)
                .retrieve()
                .body(String.class);
        String secondId = JsonPath.read(second, "$.id");

        // Now move the second entry to overlap the first -> 409
        var overlapResponse = restClient.put()
                .uri("/api/v1/time-entries/{id}", secondId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"startTime": "2026-01-01T08:30:00Z", "endTime": "2026-01-01T10:00:00Z"}
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 409, (req, res) -> {})
                .toBodilessEntity();

        assertThat(overlapResponse.getStatusCode().value()).isEqualTo(409);
        assertThat(firstId).isNotBlank();
    }

    @Test
    void stopRunningEntry_setsEndAndDuration() {
        String created = restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "Task"}
                        """)
                .retrieve()
                .body(String.class);
        String entryId = JsonPath.read(created, "$.id");

        var stopped = restClient.patch()
                .uri("/api/v1/time-entries/{id}/stop", entryId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);

        assertThat(JsonPath.<String>read(stopped, "$.endTime")).isNotNull();
        Number duration = JsonPath.read(stopped, "$.durationSeconds");
        assertThat(duration.longValue()).isGreaterThanOrEqualTo(0);
    }

    @Test
    void crossTenantProjectReference_rejected() {
        User otherAdmin = userService.createUser("other-" + uid + "@test.com", "sub-other-" + uid, "Other", null);
        Organization otherOrg = organizationService.createOrganization("Other Org " + uid, "other-org-" + uid, otherAdmin);

        // get a project from otherOrg? none exist; use a random project id from org A path
        var response = restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"projectId": "%s", "description": "x"}
                        """.formatted(UUID.randomUUID()))
                .retrieve()
                .onStatus(s -> s.value() == 400 || s.value() == 404, (req, res) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isIn(400, 404);
        organizationRepository.delete(otherOrg);
        userRepository.delete(otherAdmin);
    }

    @Test
    void manualEntry_createsFinalizedEntry() {
        var response = restClient.post()
                .uri("/api/v1/time-entries/manual")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "startTime": "2026-01-01T08:00:00Z",
                          "endTime": "2026-01-01T09:00:00Z",
                          "description": "Manual task"
                        }
                        """)
                .retrieve()
                .toEntity(String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(JsonPath.<String>read(response.getBody(), "$.endTime")).isEqualTo("2026-01-01T09:00:00Z");
        Number duration = JsonPath.read(response.getBody(), "$.durationSeconds");
        assertThat(duration.longValue()).isEqualTo(3600);
    }

    @Test
    void manualEntry_invalidRange_returns400() {
        var response = restClient.post()
                .uri("/api/v1/time-entries/manual")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "startTime": "2026-01-01T09:00:00Z",
                          "endTime": "2026-01-01T08:00:00Z",
                          "description": "Bad"
                        }
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 400, (req, res) -> {})
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void pauseResumeStop_accountsForPausedTime() throws Exception {
        String created = restClient.post()
                .uri("/api/v1/time-entries")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "Pausable"}
                        """)
                .retrieve()
                .body(String.class);
        String entryId = JsonPath.read(created, "$.id");

        var paused = restClient.patch()
                .uri("/api/v1/time-entries/{id}/pause", entryId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<String>read(paused, "$.pausedAt")).isNotNull();

        Thread.sleep(1100);

        var resumed = restClient.patch()
                .uri("/api/v1/time-entries/{id}/resume", entryId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        Number pausedSeconds = JsonPath.read(resumed, "$.pausedSeconds");
        assertThat(pausedSeconds.longValue()).isGreaterThanOrEqualTo(1);
        assertThat(JsonPath.<String>read(resumed, "$.pausedAt")).isNull();

        var stopped = restClient.patch()
                .uri("/api/v1/time-entries/{id}/stop", entryId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<String>read(stopped, "$.endTime")).isNotNull();
    }
}
