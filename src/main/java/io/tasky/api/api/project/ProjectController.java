package io.tasky.api.api.project;

import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    public ResponseEntity<ProjectResponse> create(
            @PathVariable UUID deptId,
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        if (!permissionService.canCreateProject(user, deptId)) {
            throw new SecurityException("Only admins and managers can create projects");
        }
        Project project = projectService.createProject(deptId, request.name(), request.description(), request.managerMembershipId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(project));
    }

    @GetMapping("/organizations/{orgId}/projects")
    public ResponseEntity<List<ProjectResponse>> listByOrganization(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        List<Project> projects = projectService.getProjectsByOrganization(orgId);
        return ResponseEntity.ok(projects.stream().map(this::toResponse).toList());
    }

    private ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getDepartment().getId(),
                project.getName(),
                project.getDescription(),
                project.getManagerMembership().getId(),
                project.isActive(),
                project.getCreatedAt()
        );
    }
}
