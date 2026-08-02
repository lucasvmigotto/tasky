package io.tasky.api.api.project;

import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final PermissionService permissionService;

    @PostMapping("/departments/{deptId}/projects")
    @PreAuthorize("@access.canCreateProject(authentication.principal, #deptId)")
    public ResponseEntity<ProjectResponse> create(
            @PathVariable UUID deptId,
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Project project = projectService.createProject(deptId, request.name(), request.description(), request.managerMembershipId(),
                request.clientId(), request.hourlyRate(), request.estimatedSeconds(), request.budgetSeconds(), request.budgetAmount());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(project));
    }

    @GetMapping("/organizations/{orgId}/projects")
    public ResponseEntity<List<ProjectResponse>> listByOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId) || permissionService.getMembership(user.id(), activeOrgId).isEmpty()) {
            throw new SecurityException("Not a member of this organization");
        }
        List<Project> projects = projectService.getProjectsByOrganization(activeOrgId);
        return ResponseEntity.ok(projects.stream()
                .filter(project -> permissionService.canReadProject(user, project.getId()))
                .map(this::toResponse)
                .toList());
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ProjectResponse> get(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        if (!permissionService.canReadProject(user, projectId)) {
            throw new SecurityException("Project not found");
        }
        Project project = projectService.getProject(orgId, projectId);
        return ResponseEntity.ok(toResponse(project));
    }

    @PutMapping("/projects/{projectId}")
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<ProjectResponse> update(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        Project project = projectService.updateProject(
                orgId,
                projectId,
                request.name(),
                request.description(),
                request.managerMembershipId(),
                request.clientId(),
                request.hourlyRate(),
                request.estimatedSeconds(),
                request.budgetSeconds(),
                request.budgetAmount(),
                request.isActive()
        );
        return ResponseEntity.ok(toResponse(project));
    }

    @DeleteMapping("/projects/{projectId}")
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        projectService.deleteProject(orgId, projectId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getDepartment().getId(),
                project.getName(),
                project.getDescription(),
                project.getManagerMembership().getId(),
                project.getClient() != null ? project.getClient().getId() : null,
                project.getHourlyRate(),
                project.getEstimatedSeconds(),
                project.getBudgetSeconds(),
                project.getBudgetAmount(),
                project.isActive(),
                project.getCreatedAt()
        );
    }
}
