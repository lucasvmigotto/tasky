package io.tasky.api.api.project;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.project.CrossDepartmentProjectAccess;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
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
@RequestMapping("/api/v1/projects/{projectId}/cross-department-access")
@RequiredArgsConstructor
@Transactional
public class CrossDepartmentAccessController {

    private final ProjectService projectService;
    private final PermissionService permissionService;

    @GetMapping
    @PreAuthorize("@access.canReadProject(authentication.principal, #projectId)")
    public ResponseEntity<List<CrossDepartmentAccessResponse>> list(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        List<CrossDepartmentProjectAccess> accesses = projectService.getCrossDepartmentAccesses(projectId);
        return ResponseEntity.ok(accesses.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<Void> grant(
            @PathVariable UUID projectId,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = user.activeOrganizationId();
        if (orgId == null) {
            throw new SecurityException("No active organization");
        }
        OrganizationMembership granter = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        UUID departmentId = body.get("departmentId");
        if (departmentId == null) {
            throw new IllegalArgumentException("departmentId is required");
        }
        projectService.grantCrossDepartmentAccess(projectId, departmentId, granter.getId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{departmentId}")
    @PreAuthorize("@access.canManageProject(authentication.principal, #projectId)")
    public ResponseEntity<Void> remove(
            @PathVariable UUID projectId,
            @PathVariable UUID departmentId,
            @AuthenticationPrincipal SecurityUser user) {

        projectService.removeCrossDepartmentAccess(projectId, departmentId);
        return ResponseEntity.noContent().build();
    }

    private CrossDepartmentAccessResponse toResponse(CrossDepartmentProjectAccess access) {
        return new CrossDepartmentAccessResponse(
                access.getId(),
                access.getProject().getId(),
                access.getDepartment().getId(),
                access.getGrantedBy().getId(),
                access.getGrantedAt()
        );
    }
}
