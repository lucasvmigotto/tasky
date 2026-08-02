package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.membership.OrganizationMembership;
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
@RequestMapping("/api/v1/organizations/{orgId}/memberships")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipService membershipService;
    private final PermissionService permissionService;

    @PostMapping("/invite")
    @PreAuthorize("@access.getMembership(authentication.principal.id, #orgId).isPresent()")
    public ResponseEntity<MembershipInvitationResponse> invite(
            @PathVariable UUID orgId,
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this active organization");
        }
        OrganizationMembership inviter = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        OrganizationMembership membership = membershipService.inviteUser(
                orgId, request.email(), request.role(),
                request.departmentIds(), request.teamIds(), inviter
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toInvitationResponse(membership));
    }

    @GetMapping("/invitations")
    public ResponseEntity<List<MembershipInvitationResponse>> invitations(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this active organization");
        }
        OrganizationMembership requester = permissionService.getMembership(user.id(), activeOrgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        return ResponseEntity.ok(membershipService.getInvitations(activeOrgId, requester).stream()
                .map(this::toInvitationResponse)
                .toList());
    }

    @PatchMapping("/{membershipId}/revoke-invitation")
    public ResponseEntity<Void> revokeInvitation(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this active organization");
        }
        OrganizationMembership requester = permissionService.getMembership(user.id(), activeOrgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        membershipService.revokeInvitation(activeOrgId, membershipId, requester);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<MembershipResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        List<OrganizationMembership> memberships = membershipService.getVisibleMemberships(activeOrgId, user.id());
        return ResponseEntity.ok(memberships.stream().map(this::toResponse).toList());
    }

    @PutMapping("/{membershipId}/settings")
    public ResponseEntity<MembershipResponse> updateSettings(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody UpdateMembershipSettingsRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        OrganizationMembership target = membershipService.getMembership(activeOrgId, membershipId);
        boolean managesTarget = permissionService.canManageMembership(user, membershipId);
        if (!managesTarget && !target.getUser().getId().equals(user.id())) {
            throw new SecurityException("You cannot update this member");
        }

        OrganizationMembership membership = membershipService.updateSettings(
                activeOrgId, membershipId, request.customUsername(), request.maxDailyWorkMinutes(), request.timezone());
        return ResponseEntity.ok(toResponse(membership));
    }

    @PatchMapping("/{membershipId}/role")
    @PreAuthorize("@access.canManageOrganization(authentication.principal, #orgId)")
    public ResponseEntity<MembershipResponse> changeRole(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody ChangeRoleRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        if (!permissionService.canManageOrganization(user, activeOrgId)) {
            throw new SecurityException("Only admins can change member roles");
        }
        OrganizationMembership membership = membershipService.changeRole(
                activeOrgId, membershipId, request.role(), request.departmentId(), request.teamId());
        return ResponseEntity.ok(toResponse(membership));
    }

    @DeleteMapping("/{membershipId}")
    @PreAuthorize("@access.canManageMembership(authentication.principal, #membershipId)")
    public ResponseEntity<Void> remove(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID activeOrgId = requiredOrgId(user);
        if (!orgId.equals(activeOrgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        membershipService.removeMember(activeOrgId, membershipId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private MembershipResponse toResponse(OrganizationMembership m) {
        return new MembershipResponse(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getEmail(),
                m.getUser().getUsername(),
                m.getRole(),
                m.getCustomUsername(),
                m.getMaxDailyWorkMinutes(),
                m.getPrimaryDepartmentId(),
                m.getPrimaryTeamId(),
                m.getTimezone(),
                m.getCreatedAt()
        );
    }

    private MembershipInvitationResponse toInvitationResponse(OrganizationMembership membership) {
        return new MembershipInvitationResponse(
                membership.getId(),
                membership.getUser().getEmail(),
                membership.getRole(),
                membership.getPrimaryDepartmentId(),
                membership.getPrimaryTeamId(),
                membership.getInvitationStatus(),
                membership.getInvitedAt(),
                membership.getExpiresAt(),
                membership.getAcceptedAt(),
                membership.getRevokedAt());
    }
}
