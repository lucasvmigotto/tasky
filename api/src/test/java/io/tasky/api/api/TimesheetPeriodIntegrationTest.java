package io.tasky.api.api;

import com.jayway.jsonpath.JsonPath;
import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
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
import org.springframework.http.MediaType;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TimesheetPeriodIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private TimeEntryRepository timeEntryRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User admin;
    private Organization org;
    private String token;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        admin = userService.createUser("ts-" + uid + "@test.com", "sub-ts-" + uid, "Timesheet", null);
        org = organizationService.createOrganization("TS Org " + uid, "ts-org-" + uid, admin);
        token = tokenFor(admin.getId(), admin.getEmail(), org.getId(), Role.admin);
    }

    @AfterEach
    void cleanUp() {
        timeEntryRepository.deleteAll(timeEntryRepository.findByOrganizationId(org.getId()));
        jdbcTemplate.execute("ALTER TABLE audit_events DISABLE TRIGGER trg_audit_events_immutable");
        jdbcTemplate.update("DELETE FROM audit_events WHERE organization_id = ?", org.getId());
        jdbcTemplate.execute("ALTER TABLE audit_events ENABLE TRIGGER trg_audit_events_immutable");
        jdbcTemplate.update("DELETE FROM timesheet_periods WHERE organization_id = ?", org.getId());
        organizationRepository.delete(org);
        userRepository.delete(admin);
    }

    private String createPeriod(String weekStart) {
        String body = restClient.post()
                .uri("/api/v1/timesheets/periods")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"periodStart": "%s"}
                        """.formatted(weekStart))
                .retrieve()
                .body(String.class);
        return JsonPath.read(body, "$.id");
    }

    private String submitPeriod(String periodId) {
        String body = restClient.post()
                .uri("/api/v1/timesheets/periods/{id}/submit", periodId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        return JsonPath.read(body, "$.status");
    }

    @Test
    void fullLifecycle_submitApproveCloseReopen() {
        String periodId = createPeriod("2026-08-03T00:00:00Z");
        assertThat(submitPeriod(periodId)).isEqualTo("SUBMITTED");

        String approved = restClient.post()
                .uri("/api/v1/timesheets/periods/approve")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"periodIds": ["%s"]}
                        """.formatted(periodId))
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<List<String>>read(approved, "$[*].status")).containsExactly("APPROVED");

        String closed = restClient.post()
                .uri("/api/v1/timesheets/periods/{id}/close", periodId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<String>read(closed, "$.status")).isEqualTo("LOCKED");

        String reopened = restClient.post()
                .uri("/api/v1/timesheets/periods/{id}/reopen", periodId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<String>read(reopened, "$.status")).isNotEqualTo("LOCKED");
    }

    @Test
    void batchApprove_approvesAll() {
        String p1 = createPeriod("2026-08-03T00:00:00Z");
        String p2 = createPeriod("2026-08-10T00:00:00Z");
        String p3 = createPeriod("2026-08-17T00:00:00Z");
        submitPeriod(p1);
        submitPeriod(p2);
        submitPeriod(p3);

        String approved = restClient.post()
                .uri("/api/v1/timesheets/periods/approve")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"periodIds": ["%s", "%s", "%s"]}
                        """.formatted(p1, p2, p3))
                .retrieve()
                .body(String.class);
        assertThat(JsonPath.<List<String>>read(approved, "$[*].status"))
                .containsExactly("APPROVED", "APPROVED", "APPROVED");
    }

    @Test
    void entryInClosedPeriod_cannotBeEdited() {
        String periodId = createPeriod("2026-08-03T00:00:00Z");
        submitPeriod(periodId);

        String entryJson = restClient.post()
                .uri("/api/v1/time-entries/manual")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {
                          "startTime": "2026-08-04T08:00:00Z",
                          "endTime": "2026-08-04T09:00:00Z",
                          "description": "Inside period"
                        }
                        """)
                .retrieve()
                .body(String.class);
        String entryId = JsonPath.read(entryJson, "$.id");

        restClient.post()
                .uri("/api/v1/timesheets/periods/approve")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"periodIds": ["%s"]}
                        """.formatted(periodId))
                .retrieve()
                .toBodilessEntity();
        restClient.post()
                .uri("/api/v1/timesheets/periods/{id}/close", periodId)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .toBodilessEntity();

        var response = restClient.put()
                .uri("/api/v1/time-entries/{id}", entryId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"description": "Edited after close"}
                        """)
                .retrieve()
                .onStatus(s -> s.value() == 409, (req, res) -> {})
                .toBodilessEntity();
        assertThat(response.getStatusCode().value()).isEqualTo(409);
    }
}
