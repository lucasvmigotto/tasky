package io.tasky.api.api;

import io.tasky.api.BaseIntegrationTest;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.timeentry.TimeEntry;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import io.tasky.api.domain.timeentry.TimeEntryService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import io.tasky.api.domain.user.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TimeEntryConcurrencyIntegrationTest extends BaseIntegrationTest {

    @Autowired private OrganizationService organizationService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private OrganizationMembershipRepository membershipRepository;
    @Autowired private TimeEntryRepository timeEntryRepository;
    @Autowired private TimeEntryService timeEntryService;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User user;
    private Organization org;
    private OrganizationMembership membership;

    @BeforeEach
    void setUp() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        user = userService.createUser("tc-" + uid + "@test.com", "sub-tc-" + uid, "Concurrency", null);
        org = organizationService.createOrganization("TC Org " + uid, "tc-org-" + uid, user);
        membership = membershipRepository.findByUserIdAndOrganizationId(user.getId(), org.getId()).orElseThrow();
    }

    @AfterEach
    void cleanUp() {
        timeEntryRepository.deleteAll(timeEntryRepository.findByOrganizationId(org.getId()));
        jdbcTemplate.execute("ALTER TABLE audit_events DISABLE TRIGGER trg_audit_events_immutable");
        jdbcTemplate.update("DELETE FROM audit_events WHERE organization_id = ?", org.getId());
        jdbcTemplate.execute("ALTER TABLE audit_events ENABLE TRIGGER trg_audit_events_immutable");
        organizationRepository.delete(org);
        userRepository.delete(user);
    }

    @Test
    void parallelOverlappingManuals_exactlyOneWinsRepeatedly() throws Exception {
        for (int round = 0; round < 10; round++) {
            Instant from = Instant.parse("2026-05-%02dT08:00:00Z".formatted(round + 1));
            Instant to = from.plusSeconds(3600);
            int threads = 3;
            ExecutorService pool = Executors.newFixedThreadPool(threads);
            CountDownLatch start = new CountDownLatch(1);
            List<Future<Boolean>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    try {
                        timeEntryService.manualEntry(org.getId(), membership, from, to,
                                null, null, "race", null, false);
                        return true;
                    } catch (RuntimeException e) {
                        return false;
                    }
                }));
            }
            start.countDown();
            int wins = 0;
            for (Future<Boolean> f : futures) {
                if (f.get()) {
                    wins++;
                }
            }
            pool.shutdown();

            assertThat(wins).as("round %d wins", round).isEqualTo(1);
        }
        assertThat(timeEntryRepository.findByOrganizationIdAndMembershipId(org.getId(), membership.getId()))
                .hasSize(10);
    }

    @Test
    void parallelStop_isIdempotent() throws Exception {
        TimeEntry running = timeEntryService.startEntry(org.getId(), membership,
                null, null, "running", null, false);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    TimeEntry stopped = timeEntryService.stopEntry(
                            org.getId(), membership.getId(), running.getId());
                    return stopped.getEndTime() == null ? "still-running" : "stopped";
                } catch (RuntimeException e) {
                    return "conflict:" + e.getClass().getSimpleName();
                }
            }));
        }
        start.countDown();
        List<String> outcomes = new ArrayList<>();
        for (Future<String> f : futures) {
            outcomes.add(f.get());
        }
        pool.shutdown();

        assertThat(outcomes).doesNotContain("still-running");
        assertThat(outcomes.stream().filter(o -> o.equals("stopped")).count()).isGreaterThanOrEqualTo(1);
        TimeEntry reloaded = timeEntryRepository.findByOrganizationIdAndId(org.getId(), running.getId())
                .orElseThrow();
        assertThat(reloaded.getEndTime()).isNotNull();
    }

    @Test
    void parallelUpdatesSameVersion_noSilentLostUpdate() throws Exception {
        TimeEntry created = timeEntryService.manualEntry(org.getId(), membership,
                Instant.parse("2026-05-02T08:00:00Z"), Instant.parse("2026-05-02T09:00:00Z"),
                null, null, "base", null, false);
        long version = created.getVersion();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();
        for (String description : List.of("writer-a", "writer-b")) {
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    timeEntryService.updateEntry(org.getId(), membership.getId(), created.getId(),
                            null, null, description, null, null, null, null, version);
                    return "ok";
                } catch (RuntimeException e) {
                    return "conflict:" + e.getClass().getSimpleName();
                }
            }));
        }
        start.countDown();
        List<String> outcomes = new ArrayList<>();
        for (Future<String> f : futures) {
            outcomes.add(f.get());
        }
        pool.shutdown();

        assertThat(outcomes).containsExactlyInAnyOrder("ok",
                outcomes.stream().filter(o -> o.startsWith("conflict:")).findFirst().orElseThrow());
        TimeEntry reloaded = timeEntryRepository.findByOrganizationIdAndId(org.getId(), created.getId())
                .orElseThrow();
        assertThat(reloaded.getDescription()).isIn("writer-a", "writer-b");
    }
}
