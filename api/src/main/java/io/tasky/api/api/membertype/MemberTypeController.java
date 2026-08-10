package io.tasky.api.api.membertype;

import io.tasky.api.domain.membertype.DepartmentMemberType;
import io.tasky.api.domain.membertype.DepartmentMemberTypeService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/departments/{deptId}/member-types")
@RequiredArgsConstructor
public class MemberTypeController {

    private final DepartmentMemberTypeService service;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<MemberTypeResponse>> list(@PathVariable UUID deptId,
                                                          @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(service.list(orgId, deptId).stream().map(this::toResponse).toList());
    }

    @PostMapping
    public ResponseEntity<MemberTypeResponse> create(@PathVariable UUID deptId,
                                                       @Valid @RequestBody CreateMemberTypeRequest request,
                                                       @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireManager(user, deptId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(service.create(orgId, deptId, request.name(), request.isActive())));
    }

    @PutMapping("/{memberTypeId}")
    public ResponseEntity<MemberTypeResponse> update(@PathVariable UUID deptId, @PathVariable UUID memberTypeId,
                                                       @RequestBody UpdateMemberTypeRequest request,
                                                       @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireManager(user, deptId);
        return ResponseEntity.ok(toResponse(service.update(orgId, deptId, memberTypeId, request.name(), request.isActive())));
    }

    @DeleteMapping("/{memberTypeId}")
    public ResponseEntity<Void> delete(@PathVariable UUID deptId, @PathVariable UUID memberTypeId,
                                       @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireManager(user, deptId);
        service.delete(orgId, deptId, memberTypeId);
        return ResponseEntity.noContent().build();
    }

    private void requireManager(SecurityUser user, UUID deptId) {
        if (!permissionService.canManageDepartment(user, deptId)) {
            throw new SecurityException("Only an admin or department manager can manage member types");
        }
    }

    private void requireMember(SecurityUser user, UUID orgId) {
        if (permissionService.getMembership(user.id(), orgId).isEmpty()) {
            throw new SecurityException("Not a member of this organization");
        }
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) throw new SecurityException("No active organization");
        return user.activeOrganizationId();
    }

    private MemberTypeResponse toResponse(DepartmentMemberType type) {
        return new MemberTypeResponse(type.getId(), type.getDepartment().getId(), type.getName(),
                type.isActive(), type.getCreatedAt(), type.getUpdatedAt());
    }
}
