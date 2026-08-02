package io.tasky.api.api.label;

import io.tasky.api.domain.label.Label;
import io.tasky.api.domain.label.LabelService;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.Role;
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
@RequestMapping("/api/v1/organizations/{orgId}/labels")
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;
    private final PermissionService permissionService;

    @PostMapping
    @PreAuthorize("@access.getMembership(authentication.principal.id, #orgId) != null")
    public ResponseEntity<LabelResponse> create(
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateLabelRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), activeOrgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        if (membership.getRole() == Role.employee) {
            throw new SecurityException("Only managers and leaders can create labels");
        }

        Label label = labelService.createLabel(activeOrgId, request.slug(), request.displayName(), membership);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(label));
    }

    @GetMapping
    public ResponseEntity<List<LabelResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId) || permissionService.getMembership(user.id(), activeOrgId).isEmpty()) {
            throw new SecurityException("Not a member of this organization");
        }
        List<Label> labels = labelService.getLabelsByOrganization(activeOrgId);
        return ResponseEntity.ok(labels.stream().map(this::toResponse).toList());
    }

    @DeleteMapping("/{labelId}")
    @PreAuthorize("@access.getMembership(authentication.principal.id, #orgId) != null")
    public ResponseEntity<Void> delete(
            @PathVariable UUID orgId,
            @PathVariable UUID labelId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), activeOrgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        if (membership.getRole() == Role.employee) {
            throw new SecurityException("Only managers and leaders can delete labels");
        }

        labelService.deleteLabel(activeOrgId, labelId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{labelId}")
    @PreAuthorize("@access.getMembership(authentication.principal.id, #orgId) != null")
    public ResponseEntity<LabelResponse> update(
            @PathVariable UUID orgId,
            @PathVariable UUID labelId,
            @Valid @RequestBody UpdateLabelRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        OrganizationMembership membership = permissionService.getMembership(user.id(), activeOrgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        if (membership.getRole() == Role.employee) {
            throw new SecurityException("Only managers and leaders can update labels");
        }

        Label label = labelService.updateLabel(activeOrgId, labelId, request.slug(), request.displayName());
        return ResponseEntity.ok(toResponse(label));
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private LabelResponse toResponse(Label label) {
        return new LabelResponse(
                label.getId(),
                label.getSlug(),
                label.getDisplayName(),
                label.isSystem(),
                label.getCreatedBy() != null ? label.getCreatedBy().getId() : null,
                label.getCreatedAt()
        );
    }
}
