package io.tasky.api.api.project;

import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/cross-department-access")
@RequiredArgsConstructor
public class CrossDepartmentAccessController {

    private final ProjectService projectService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<Void> grant(
            @PathVariable UUID projectId,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal SecurityUser user) {

        UUID departmentId = body.get("departmentId");
        projectService.grantCrossDepartmentAccess(projectId, departmentId, null);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
