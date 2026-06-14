package io.tasky.api.domain.activity;

import io.tasky.api.domain.label.LabelRepository;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private ActivityDependencyRepository dependencyRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private OrganizationMembershipRepository membershipRepository;
    @Mock
    private LabelRepository labelRepository;
    @Mock
    private PermissionService permissionService;

    @InjectMocks
    private ActivityService activityService;

    @Test
    void createActivity_startAfterEnd_throwsException() {
        SecurityUser user = adminUser();
        assertThrows(IllegalArgumentException.class, () ->
                activityService.createActivity(
                        UUID.randomUUID(), "Test", "Desc", (short) 1,
                        Instant.now().plusSeconds(3600), Instant.now(),
                        UUID.randomUUID(), null, null, user
                ));
    }

    @Test
    void createActivity_withInvalidWeight_throwsException() {
        SecurityUser user = adminUser();
        assertThrows(IllegalArgumentException.class, () ->
                activityService.createActivity(
                        UUID.randomUUID(), "Test", "Desc", (short) 4,
                        Instant.now(), Instant.now().plusSeconds(3600),
                        UUID.randomUUID(), null, null, user
                ));
    }

    @Test
    void createActivity_withEqualDates_throwsException() {
        SecurityUser user = adminUser();
        Instant now = Instant.now();
        assertThrows(IllegalArgumentException.class, () ->
                activityService.createActivity(
                        UUID.randomUUID(), "Test", "Desc", (short) 1,
                        now, now,
                        UUID.randomUUID(), null, null, user
                ));
    }

    private SecurityUser adminUser() {
        return SecurityUser.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .role(Role.admin)
                .build();
    }
}
