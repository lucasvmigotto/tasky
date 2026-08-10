package io.tasky.api.api.projectcolumn;

import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.projectcolumn.ProjectColumn;
import io.tasky.api.domain.projectcolumn.ProjectColumnService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/columns")
@RequiredArgsConstructor
public class ProjectColumnController {

    private final ProjectColumnService columnService;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<ProjectColumnResponse>> list(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        requireRead(user, projectId);
        return ResponseEntity.ok(columnService.list(requiredOrgId(user), projectId).stream()
                .map(this::toResponse).toList());
    }

    @PostMapping
    public ResponseEntity<ProjectColumnResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateProjectColumnRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        requireManage(user, projectId);
        ProjectColumn column = columnService.create(requiredOrgId(user), projectId,
                request.name(), request.color(), parseStatus(request.lifecycleStatus()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(column));
    }

    @PutMapping("/{columnId}")
    public ResponseEntity<ProjectColumnResponse> update(
            @PathVariable UUID projectId,
            @PathVariable UUID columnId,
            @RequestBody UpdateProjectColumnRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        requireManage(user, projectId);
        ProjectColumn column = columnService.update(requiredOrgId(user), projectId, columnId,
                request.name(), request.color(), request.lifecycleStatus(), request.position());
        return ResponseEntity.ok(toResponse(column));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<List<ProjectColumnResponse>> reorder(
            @PathVariable UUID projectId,
            @Valid @RequestBody ReorderProjectColumnsRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        requireManage(user, projectId);
        columnService.reorder(requiredOrgId(user), projectId,
                request.columnIds().stream().map(UUID::fromString).toList());
        return ResponseEntity.ok(columnService.list(requiredOrgId(user), projectId).stream()
                .map(this::toResponse).toList());
    }

    @DeleteMapping("/{columnId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID projectId,
            @PathVariable UUID columnId,
            @AuthenticationPrincipal SecurityUser user) {
        requireManage(user, projectId);
        columnService.delete(requiredOrgId(user), projectId, columnId);
        return ResponseEntity.noContent().build();
    }

    private void requireRead(SecurityUser user, UUID projectId) {
        if (user == null || !permissionService.canReadProject(user, projectId)) {
            throw new SecurityException("Project not found");
        }
    }

    private void requireManage(SecurityUser user, UUID projectId) {
        if (user == null || !permissionService.canManageProject(user, projectId)) {
            throw new SecurityException("You cannot manage this project's columns");
        }
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user == null || user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private ActivityStatus parseStatus(String value) {
        try {
            return ActivityStatus.valueOf(value.toUpperCase(java.util.Locale.ROOT));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid lifecycle status: " + value);
        }
    }

    private ProjectColumnResponse toResponse(ProjectColumn column) {
        return new ProjectColumnResponse(
                column.getId(),
                column.getProject().getId(),
                column.getName(),
                column.getPosition(),
                column.getColor(),
                column.getLifecycleStatus().name());
    }
}
