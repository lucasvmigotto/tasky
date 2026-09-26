package io.tasky.api.seed;

import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityComment;
import io.tasky.api.domain.activity.ActivityCommentRepository;
import io.tasky.api.domain.activity.ActivityDependency;
import io.tasky.api.domain.activity.ActivityDependencyRepository;
import io.tasky.api.domain.activity.ActivityPriority;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.activity.ActivityTaskType;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentService;
import io.tasky.api.domain.membership.InvitationStatus;
import io.tasky.api.domain.membership.ManagerDepartment;
import io.tasky.api.domain.membership.ManagerDepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationService;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.domain.request.InternalRequestService;
import io.tasky.api.domain.request.RequestPriority;
import io.tasky.api.domain.setting.AppSetting;
import io.tasky.api.domain.setting.AppSettingRepository;
import io.tasky.api.domain.setting.SettingScope;
import io.tasky.api.domain.setting.SettingValueType;
import io.tasky.api.domain.timeentry.TimeEntry;
import io.tasky.api.domain.timeentry.TimeEntryApprovalStatus;
import io.tasky.api.domain.timeentry.TimeEntryRepository;
import io.tasky.api.domain.timesheet.TimesheetPeriodService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Synthetic development dataset (dev profile only, opt-in via
 * {@code TASKY_SEED_DATA=true}). Deterministic (fixed RNG seed), idempotent
 * via a global {@code app_settings} marker, and constraint-aware:
 * finished entries only (no running timers), sequential non-overlapping
 * slots per member/day, canonical timesheet weeks, all memberships
 * accepted + active.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    static final String MARKER_KEY = "seed.dev-dataset";
    private static final long RNG_SEED = 42L;
    private static final short[] FIB_WEIGHTS = {1, 2, 3, 5, 8};
    /**
     * The local mock OIDC provider namespaces its subject as
     * {@code mock-google:<sub>} (see MockOidcTokenVerifier). Seeding googleSub
     * with the same prefix lets a developer log in as a seeded user by
     * entering the bare sub (e.g. {@code seed-sub-1}) in the mock login form.
     */
    private static final String MOCK_GOOGLE_PREFIX = "mock-google:";

    private final Environment environment;
    private final UserService userService;
    private final OrganizationService organizationService;
    private final DepartmentService departmentService;
    private final OrganizationMembershipRepository membershipRepository;
    private final ManagerDepartmentRepository managerDepartmentRepository;
    private final ProjectService projectService;
    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;
    private final ActivityCommentRepository commentRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final TimesheetPeriodService timesheetPeriodService;
    private final InternalRequestService requestService;
    private final AppSettingRepository settingRepository;

    private record Scale(int users, int departments, int projects, int activities, int requests) {}

    @Override
    public void run(ApplicationArguments args) {
        if (Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
            throw new IllegalStateException("DevDataSeeder must never run with the prod profile");
        }
        if (!"true".equalsIgnoreCase(System.getenv("TASKY_SEED_DATA"))) {
            log.info("seed: TASKY_SEED_DATA not set, skipping synthetic dataset");
            return;
        }
        if (settingRepository.findByScopeAndKey(SettingScope.GLOBAL, MARKER_KEY).isPresent()) {
            log.info("seed: dataset already present, skipping");
            return;
        }
        String profile = System.getenv().getOrDefault("TASKY_SEED_PROFILE", "medium");
        Scale scale = "large".equalsIgnoreCase(profile)
                ? new Scale(100, 8, 50, 2000, 40)
                : new Scale(25, 4, 15, 300, 15);
        log.info("seed: generating '{}' dataset (users={}, departments={}, projects={}, activities={})",
                profile, scale.users(), scale.departments(), scale.projects(), scale.activities());

        Random rng = new Random(RNG_SEED);
        // Window of 8 weeks ending in the current week, so a seeded user has
        // hours "this week" (the work home and timesheet are not empty).
        Instant baseMonday = LocalDate.now(ZoneOffset.UTC)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .minusWeeks(7)
                .atStartOfDay(ZoneOffset.UTC).toInstant();

        // 1. Founder + org (UTC keeps week math trivial).
        User founder = userService.createUser("seed-founder@example.com",
                MOCK_GOOGLE_PREFIX + "seed-founder-sub", "Seed Founder", null);
        Organization org = organizationService.createOrganization("Seed Org", "seed-org", "UTC", founder);
        OrganizationMembership founderMembership = membershipRepository
                .findByOrganizationId(org.getId()).stream()
                .filter(m -> m.getUser().getId().equals(founder.getId()))
                .findFirst().orElseThrow();

        // 2. Departments.
        List<Department> departments = new ArrayList<>();
        for (int i = 0; i < scale.departments(); i++) {
            departments.add(departmentService.createDepartment(org.getId(), "Seed Dept " + (char) ('A' + i)));
        }

        // 3. Users + accepted/active memberships.
        int managers = Math.max(2, scale.users() / 8);
        List<OrganizationMembership> members = new ArrayList<>();
        members.add(founderMembership);
        for (int i = 1; i < scale.users(); i++) {
            String email = String.format("seed-u%03d@example.com", i);
            User u = userService.createUser(email, MOCK_GOOGLE_PREFIX + "seed-sub-" + i, "Seed User " + i, null);
            Role role = i <= managers ? Role.manager : Role.employee;
            Department dept = departments.get(i % departments.size());
            OrganizationMembership m = OrganizationMembership.builder()
                    .user(u)
                    .organization(org)
                    .role(role)
                    .primaryDepartmentId(dept.getId())
                    .maxDailyWorkMinutes(480)
                    .invitationStatus(InvitationStatus.ACCEPTED)
                    .acceptedAt(Instant.now())
                    .build();
            membershipRepository.save(m);
            if (role == Role.manager) {
                // Managers must manage a department to see its sector report,
                // approval queue and members.
                managerDepartmentRepository.save(ManagerDepartment.builder()
                        .id(new ManagerDepartment.ManagerDepartmentId(m.getId(), dept.getId()))
                        .membership(m)
                        .department(dept)
                        .build());
            }
            members.add(m);
        }

        // 4. Projects (service seeds default columns) + assignments.
        List<Project> projects = new ArrayList<>();
        List<OrganizationMembership> assignable = members.subList(1, members.size());
        java.util.Map<UUID, List<Project>> assignedProjects = new java.util.HashMap<>();
        for (int i = 0; i < scale.projects(); i++) {
            Department dept = departments.get(i % departments.size());
            OrganizationMembership pm = members.get(1 + (i % managers));
            Project p = projectService.createProject(
                    org.getId(), dept.getId(), "Seed Project " + (i + 1),
                    "Synthetic project for development",
                    String.format("#%06X", rng.nextInt(0xFFFFFF)),
                    pm.getId(),
                    BigDecimal.valueOf(80 + rng.nextInt(140)),
                    (long) rng.nextInt(200 * 3600), null, null);
            projects.add(p);
            for (int a = 0; a < Math.min(4, assignable.size()); a++) {
                OrganizationMembership assignee = assignable.get((i * 4 + a) % assignable.size());
                try {
                    projectService.assignEmployee(org.getId(), p.getId(), assignee.getId());
                } catch (IllegalArgumentException alreadyAssigned) {
                    // deterministic overlap across projects; ignore duplicates
                }
                assignedProjects.computeIfAbsent(assignee.getId(), k -> new ArrayList<>()).add(p);
            }
        }

        SecurityUser founderUser = SecurityUser.builder()
                .id(founder.getId()).email(founder.getEmail())
                .activeOrganizationId(org.getId()).role(Role.admin).build();

        // 5. Activities (batched direct inserts; acyclic deps by construction).
        List<Activity> activities = new ArrayList<>();
        int perProject = Math.max(1, scale.activities() / scale.projects());
        List<Activity> batch = new ArrayList<>();
        for (int pi = 0; pi < projects.size(); pi++) {
            Project p = projects.get(pi);
            List<Activity> inProject = new ArrayList<>();
            for (int a = 0; a < perProject; a++) {
                OrganizationMembership owner = assignable.get(rng.nextInt(assignable.size()));
                Instant start = baseMonday.plus(rng.nextInt(56), ChronoUnit.DAYS)
                        .plus(9 + rng.nextInt(6), ChronoUnit.HOURS);
                Activity act = Activity.builder()
                        .project(p)
                        .title("Seed activity " + (pi + 1) + "." + (a + 1))
                        .description("Synthetic activity for development")
                        .weight(FIB_WEIGHTS[rng.nextInt(FIB_WEIGHTS.length)])
                        .startDatetime(start)
                        .endDatetime(start.plus(1 + rng.nextInt(5), ChronoUnit.DAYS))
                        .status(pickStatus(rng))
                        .taskType(ActivityTaskType.values()[rng.nextInt(ActivityTaskType.values().length)])
                        .priority(ActivityPriority.values()[rng.nextInt(ActivityPriority.values().length)])
                        .position(a * 1000)
                        .estimatedSeconds((1 + rng.nextInt(8)) * 3600L)
                        .createdBy(founderMembership)
                        .assignedTo(owner)
                        .completedAt(null)
                        .build();
                if (act.getStatus() == ActivityStatus.DONE) {
                    act.setCompletedAt(act.getEndDatetime());
                }
                // 15% subtasks, depth 1 only.
                if (!inProject.isEmpty() && rng.nextDouble() < 0.15) {
                    act.setParentActivity(inProject.get(rng.nextInt(inProject.size())));
                }
                batch.add(act);
                inProject.add(act);
                if (batch.size() >= 200) {
                    activities.addAll(activityRepository.saveAll(batch));
                    batch.clear();
                }
            }
        }
        if (!batch.isEmpty()) {
            activities.addAll(activityRepository.saveAll(batch));
            batch.clear();
        }

        // Dependencies: later activity depends on an earlier one, same project.
        List<ActivityDependency> deps = new ArrayList<>();
        var byProject = new java.util.HashMap<java.util.UUID, List<Activity>>();
        for (Activity a : activities) {
            byProject.computeIfAbsent(a.getProject().getId(), k -> new ArrayList<>()).add(a);
        }
        for (List<Activity> inProject : byProject.values()) {
            for (int i = 1; i < inProject.size() && deps.size() < scale.activities() / 10; i++) {
                if (rng.nextDouble() < 0.12) {
                    deps.add(ActivityDependency.builder()
                            .parentActivity(inProject.get(rng.nextInt(i)))
                            .childActivity(inProject.get(i))
                            .build());
                }
            }
        }
        dependencyRepository.saveAll(deps);

        // Comments on ~30% of activities.
        List<ActivityComment> comments = new ArrayList<>();
        for (Activity a : activities) {
            if (rng.nextDouble() < 0.3) {
                int n = 1 + rng.nextInt(3);
                for (int c = 0; c < n; c++) {
                    comments.add(ActivityComment.builder()
                            .activity(a)
                            .author(members.get(rng.nextInt(members.size())))
                            .content("Seed comment " + (c + 1) + " on " + a.getTitle())
                            .build());
                }
            }
        }
        commentRepository.saveAll(comments);

        // 6. Internal requests via service (sequence + audit handled).
        for (int i = 0; i < scale.requests(); i++) {
            Department d = departments.get(i % departments.size());
            requestService.create(org.getId(), founderUser,
                    "Seed demand " + (i + 1), "Synthetic demand for development",
                    String.format("GLPI-%05d", 10000 + i),
                    RequestPriority.values()[rng.nextInt(RequestPriority.values().length)],
                    d.getId(), departments.get((i + 1) % departments.size()).getId(),
                    baseMonday.plus(60 + rng.nextInt(20), ChronoUnit.DAYS),
                    List.of(members.get(1 + (i % (members.size() - 1))).getId()));
        }

        // 7. Time entries: sequential non-overlapping slots, all finished.
        boolean large = scale.users() > 50;
        int entriesPerDay = large ? 6 : 2;
        int dayStartHour = large ? 8 : 9;
        int dayEndHour = large ? 18 : 16;
        int dayEndMin = large ? 0 : 30;
        List<TimeEntry> entryBatch = new ArrayList<>();
        long entryCount = 0;
        java.util.Set<UUID> membersWithEntries = new java.util.HashSet<>();
        for (OrganizationMembership m : members) {
            // Only projects the member is assigned to, so the timesheet and
            // reports can resolve project names (unseen projects render blank).
            List<Project> mine = new ArrayList<>(assignedProjects.getOrDefault(m.getId(), List.of()));
            if (mine.isEmpty()) {
                continue; // no readable project for this member
            }
            for (int day = 0; day < 56; day++) {
                LocalDate date = LocalDate.ofInstant(baseMonday, ZoneOffset.UTC).plusDays(day);
                if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                    continue;
                }
                Instant cursor = date.atStartOfDay(ZoneOffset.UTC).toInstant().plus(dayStartHour, ChronoUnit.HOURS);
                Instant dayEnd = date.atStartOfDay(ZoneOffset.UTC).toInstant().plus(dayEndHour, ChronoUnit.HOURS)
                        .plus(dayEndMin, ChronoUnit.MINUTES);
                for (int e = 0; e < entriesPerDay && cursor.isBefore(dayEnd); e++) {
                    long minutes = 45 + rng.nextInt(106);
                    Instant end = cursor.plus(minutes, ChronoUnit.MINUTES);
                    if (end.isAfter(dayEnd) || rng.nextDouble() < 0.08) {
                        break;
                    }
                    Project p = mine.get(rng.nextInt(mine.size()));
                    TimeEntryApprovalStatus st = pickEntryStatus(rng);
                    TimeEntry te = TimeEntry.builder()
                            .membership(m)
                            .organization(org)
                            .project(p)
                            .description("Seed work " + date + " #" + (e + 1))
                            .startTime(cursor)
                            .endTime(end)
                            .durationSeconds(end.getEpochSecond() - cursor.getEpochSecond())
                            .pausedSeconds(0L)
                            .billable(rng.nextDouble() < 0.6)
                            .approvalStatus(st)
                            .billingRateSnapshot(p.getHourlyRate())
                            .submittedAt(st == TimeEntryApprovalStatus.DRAFT ? null : end.plus(1, ChronoUnit.HOURS))
                            .approvedAt(st == TimeEntryApprovalStatus.APPROVED
                                    ? end.plus(2, ChronoUnit.HOURS) : null)
                            .approvedBy(st == TimeEntryApprovalStatus.APPROVED ? founderMembership : null)
                            .rejectionComment(st == TimeEntryApprovalStatus.REJECTED ? "Seed rejection" : null)
                            .build();
                    entryBatch.add(te);
                    entryCount++;
                    membersWithEntries.add(m.getId());
                    cursor = end.plus(5 + rng.nextInt(16), ChronoUnit.MINUTES);
                    if (entryBatch.size() >= 1000) {
                        timeEntryRepository.saveAll(entryBatch);
                        entryBatch.clear();
                    }
                }
            }
        }
        if (!entryBatch.isEmpty()) {
            timeEntryRepository.saveAll(entryBatch);
        }

        // 8. Timesheet periods: canonical weeks via service, mixed lifecycle.
        // Only for members with entries, so no empty 0h weeks clutter the grid
        // or the approval queue.
        for (OrganizationMembership m : members) {
            if (!membersWithEntries.contains(m.getId())) {
                continue;
            }
            SecurityUser su = SecurityUser.builder()
                    .id(m.getUser().getId()).email(m.getUser().getEmail())
                    .activeOrganizationId(org.getId()).role(m.getRole()).build();
            for (int w = 0; w < 8; w++) {
                Instant weekStart = baseMonday.plus(w * 7L, ChronoUnit.DAYS);
                var period = timesheetPeriodService.createPeriod(su, weekStart);
                double roll = rng.nextDouble();
                if (roll < 0.6) {
                    var submitted = timesheetPeriodService.submitPeriod(su, period.getId());
                    if (roll < 0.3) {
                        timesheetPeriodService.approvePeriods(founderUser, List.of(submitted.getId()));
                    }
                }
            }
        }

        settingRepository.save(AppSetting.builder()
                .key(MARKER_KEY)
                .scope(SettingScope.GLOBAL)
                .valueType(SettingValueType.STRING)
                .value(profile)
                .description("Synthetic dev dataset marker (DevDataSeeder, do not use in prod)")
                .build());

        log.info("seed: done (entries={}, deps={}, comments={})", entryCount, deps.size(), comments.size());
    }

    private static ActivityStatus pickStatus(Random rng) {
        double r = rng.nextDouble();
        if (r < 0.5) {
            return ActivityStatus.DONE;
        }
        if (r < 0.7) {
            return ActivityStatus.IN_PROGRESS;
        }
        if (r < 0.9) {
            return ActivityStatus.TODO;
        }
        return ActivityStatus.values()[rng.nextInt(ActivityStatus.values().length)];
    }

    private static TimeEntryApprovalStatus pickEntryStatus(Random rng) {
        double r = rng.nextDouble();
        if (r < 0.7) {
            return TimeEntryApprovalStatus.DRAFT;
        }
        if (r < 0.85) {
            return TimeEntryApprovalStatus.SUBMITTED;
        }
        if (r < 0.95) {
            return TimeEntryApprovalStatus.APPROVED;
        }
        return TimeEntryApprovalStatus.REJECTED;
    }
}
