package io.tasky.api.api.department;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentService;
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
@RequestMapping("/api/v1/organizations/{orgId}/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateDepartmentRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        if (!permissionService.canManageOrganization(user, orgId)) {
            throw new SecurityException("Only admins can create departments");
        }

        Department dept = departmentService.createDepartment(orgId, request.name());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(dept));
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {

        List<Department> departments = departmentService.getDepartmentsByOrganization(orgId);
        return ResponseEntity.ok(departments.stream().map(this::toResponse).toList());
    }

    private DepartmentResponse toResponse(Department dept) {
        return new DepartmentResponse(
                dept.getId(),
                dept.getOrganization().getId(),
                dept.getName(),
                dept.getCreatedAt()
        );
    }
}
