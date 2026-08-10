package io.tasky.api.api.project;

import io.tasky.api.domain.project.ProjectAssignment;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/assignments")
@RequiredArgsConstructor
public class ProjectAssignmentController {

    private final ProjectService projectService;
    private final PermissionService permissionService;

    @GetMapping
    @PreAuthorize("@access.canReadProject(authentication.principal, #projectId)")
    public ResponseEntity<List<ProjectAssignmentResponse>> list(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        List<ProjectAssignment> assignments = projectService.getAssignments(projectId);
        return ResponseEntity.ok(assignments.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<Void> assign(
            @PathVariable UUID projectId,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal SecurityUser user) {

        projectService.assignEmployee(projectId, body.get("membershipId"));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{membershipId}")
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<Void> remove(
            @PathVariable UUID projectId,
            @PathVariable UUID membershipId,
            @AuthenticationPrincipal SecurityUser user) {

        projectService.removeAssignment(projectId, membershipId);
        return ResponseEntity.noContent().build();
    }

    private ProjectAssignmentResponse toResponse(ProjectAssignment assignment) {
        return new ProjectAssignmentResponse(
                assignment.getId(),
                assignment.getProject().getId(),
                assignment.getMembership().getId(),
                assignment.getAssignedAt()
        );
    }
}
