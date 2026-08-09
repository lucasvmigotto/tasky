package io.tasky.api.domain.activity;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private ActivityCommentRepository activityCommentRepository;
    @Mock
    private ActivityAttachmentRepository activityAttachmentRepository;
    @Mock
    private ActivityDependencyRepository dependencyRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private OrganizationMembershipRepository membershipRepository;
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
                        UUID.randomUUID(), null, user
                ));
    }

    @Test
    void createActivity_withInvalidWeight_throwsException() {
        SecurityUser user = adminUser();
        assertThrows(IllegalArgumentException.class, () ->
                activityService.createActivity(
                        UUID.randomUUID(), "Test", "Desc", (short) 4,
                        Instant.now(), Instant.now().plusSeconds(3600),
                        UUID.randomUUID(), null, user
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
                        UUID.randomUUID(), null, user
                ));
    }

    @Test
    void addDependency_whenChildAlreadyReachesParent_rejectsCycle() {
        UUID orgId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Project project = Project.builder().id(projectId).build();
        Activity parent = Activity.builder().id(UUID.randomUUID()).project(project).build();
        Activity child = Activity.builder().id(UUID.randomUUID()).project(project).build();
        ActivityDependency existingPath = ActivityDependency.builder()
                .parentActivity(child)
                .childActivity(parent)
                .build();

        when(activityRepository.findByIdAndProject_Department_Organization_Id(child.getId(), orgId))
                .thenReturn(Optional.of(child));
        when(activityRepository.findByIdAndProject_Department_Organization_Id(parent.getId(), orgId))
                .thenReturn(Optional.of(parent));
        when(dependencyRepository.findByParentActivityId(child.getId())).thenReturn(List.of(existingPath));

        assertThrows(IllegalArgumentException.class,
                () -> activityService.addDependency(orgId, child.getId(), parent.getId()));
        verify(dependencyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void addDependency_acrossProjects_isRejected() {
        UUID orgId = UUID.randomUUID();
        Activity parent = Activity.builder().id(UUID.randomUUID())
                .project(Project.builder().id(UUID.randomUUID()).build()).build();
        Activity child = Activity.builder().id(UUID.randomUUID())
                .project(Project.builder().id(UUID.randomUUID()).build()).build();

        when(activityRepository.findByIdAndProject_Department_Organization_Id(child.getId(), orgId))
                .thenReturn(Optional.of(child));
        when(activityRepository.findByIdAndProject_Department_Organization_Id(parent.getId(), orgId))
                .thenReturn(Optional.of(parent));

        assertThrows(IllegalArgumentException.class,
                () -> activityService.addDependency(orgId, child.getId(), parent.getId()));
        verify(dependencyRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void addAttachment_withUnsafeUrlScheme_isRejected() {
        UUID orgId = UUID.randomUUID();
        Activity activity = Activity.builder().id(UUID.randomUUID()).build();
        OrganizationMembership uploader = OrganizationMembership.builder()
                .id(UUID.randomUUID())
                .organization(Organization.builder().id(orgId).build())
                .build();
        when(activityRepository.findByIdAndProject_Department_Organization_Id(activity.getId(), orgId))
                .thenReturn(Optional.of(activity));

        assertThrows(IllegalArgumentException.class, () -> activityService.addAttachment(
                orgId, activity.getId(), uploader, "payload.txt", "text/plain", 10,
                "javascript:alert(1)"));
        verify(activityAttachmentRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private SecurityUser adminUser() {
        return SecurityUser.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .role(Role.admin)
                .build();
    }
}
