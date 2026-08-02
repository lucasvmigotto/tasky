package io.tasky.api.api.department;

import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentService;
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
@RequestMapping("/api/v1/organizations/{orgId}/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final PermissionService permissionService;

    @PostMapping
    @PreAuthorize("@access.canManageOrganization(authentication.principal, #orgId)")
    public ResponseEntity<DepartmentResponse> create(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateDepartmentRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Department dept = departmentService.createDepartment(orgId, request.name());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(dept));
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId) || permissionService.getMembership(user.id(), activeOrgId).isEmpty()) {
            throw new SecurityException("Not a member of this organization");
        }
        List<Department> departments = departmentService.getDepartmentsByOrganization(activeOrgId);
        return ResponseEntity.ok(departments.stream().map(this::toResponse).toList());
    }

    @PutMapping("/{deptId}")
    @PreAuthorize("@access.canManageOrganization(authentication.principal, #orgId)")
    public ResponseEntity<DepartmentResponse> update(
            @PathVariable UUID orgId,
            @PathVariable UUID deptId,
            @Valid @RequestBody CreateDepartmentRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Department dept = departmentService.renameDepartment(orgId, deptId, request.name());
        return ResponseEntity.ok(toResponse(dept));
    }

    @DeleteMapping("/{deptId}")
    @PreAuthorize("@access.canManageOrganization(authentication.principal, #orgId)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID orgId,
            @PathVariable UUID deptId,
            @AuthenticationPrincipal SecurityUser user) {

        departmentService.deleteDepartment(orgId, deptId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
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
