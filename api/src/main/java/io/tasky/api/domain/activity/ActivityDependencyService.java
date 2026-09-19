package io.tasky.api.domain.activity;

import io.tasky.api.api.activity.ActivityAttachmentResponse;
import io.tasky.api.api.activity.ActivityCommentResponse;
import io.tasky.api.api.activity.ActivityFeedResponse;
import io.tasky.api.api.activity.ActivityMentionResponse;
import io.tasky.api.api.activity.ActivityResponse;
import io.tasky.api.api.common.ConflictException;
import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.config.AppConfig;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.notification.NotificationService;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.projectcolumn.ProjectColumn;
import io.tasky.api.domain.projectcolumn.ProjectColumnRepository;
import io.tasky.api.domain.storage.StoredFile;
import io.tasky.api.domain.storage.StoredFileRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityDependencyService {

    private final ActivityRepository activityRepository;
    private final ActivityDependencyRepository dependencyRepository;
    public void addDependency(UUID orgId, UUID childId, UUID parentId) {
        Activity child = activityRepository.findByIdAndProject_Department_Organization_Id(childId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Child activity not found"));
        Activity parent = activityRepository.findByIdAndProject_Department_Organization_Id(parentId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Parent activity not found"));
        addDependencyInternal(parent, child);
    }

    void addDependencyInternal(Activity parent, Activity child) {
        dependencyRepository.acquireProjectAdvisoryLock(parent.getProject().getId().toString());
        if (parent.getId().equals(child.getId())) {
            throw new IllegalArgumentException("An activity cannot depend on itself");
        }
        if (!parent.getProject().getId().equals(child.getProject().getId())) {
            throw new IllegalArgumentException("Dependencies must belong to the same project");
        }

        if (wouldCreateCycle(parent, child)) {
            throw new IllegalArgumentException("Adding this dependency would create a cycle");
        }

        ActivityDependency dependency = ActivityDependency.builder()
                .parentActivity(parent)
                .childActivity(child)
                .build();
        dependencyRepository.save(dependency);
    }

    private boolean wouldCreateCycle(Activity parent, Activity child) {
        Set<UUID> visited = new HashSet<>();
        return wouldCreateCycleRecursive(child.getId(), parent.getId(), visited);
    }

    private boolean wouldCreateCycleRecursive(UUID currentId, UUID targetId, Set<UUID> visited) {
        if (currentId.equals(targetId)) {
            return true;
        }
        if (visited.contains(currentId)) {
            return false;
        }
        visited.add(currentId);
        List<ActivityDependency> deps = dependencyRepository.findByParentActivityId(currentId);
        for (ActivityDependency dep : deps) {
            if (wouldCreateCycleRecursive(dep.getChildActivity().getId(), targetId, visited)) {
                return true;
            }
        }
        return false;
    }

    public void removeDependency(UUID orgId, UUID childId, UUID parentId) {
        Activity child = activityRepository.findByIdAndProject_Department_Organization_Id(childId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Child activity not found"));
        dependencyRepository.acquireProjectAdvisoryLock(child.getProject().getId().toString());
        dependencyRepository.findByParentActivityIdAndChildActivityId(parentId, childId)
                .filter(d -> d.getParentActivity() != null
                        && d.getParentActivity().getProject() != null
                        && d.getParentActivity().getProject().getDepartment() != null
                        && d.getParentActivity().getProject().getDepartment().getOrganization() != null
                        && d.getParentActivity().getProject().getDepartment().getOrganization().getId().equals(orgId))
                .ifPresent(dependencyRepository::delete);
    }
}
