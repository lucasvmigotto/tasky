package io.tasky.api.api.membership;

import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.membership.OrganizationMembership;
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
    public ResponseEntity<MembershipResponse> invite(
            @PathVariable UUID orgId,
            @Valid @RequestBody InviteRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership inviter = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        OrganizationMembership membership = membershipService.inviteUser(
                orgId, request.email(), request.role(),
                request.departmentIds(), request.teamIds(), inviter
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toResponse(membership));
    }

    @GetMapping
    public ResponseEntity<List<MembershipResponse>> list(
            @PathVariable UUID orgId,
            @AuthenticationPrincipal SecurityUser user) {
        List<OrganizationMembership> memberships = membershipService.getMemberships(orgId);
        return ResponseEntity.ok(memberships.stream().map(this::toResponse).toList());
    }

    @PutMapping("/{membershipId}/settings")
    public ResponseEntity<MembershipResponse> updateSettings(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody UpdateMembershipSettingsRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = membershipService.updateSettings(
                membershipId, request.customUsername(), request.maxDailyWorkMinutes());
        return ResponseEntity.ok(toResponse(membership));
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
                m.getCreatedAt()
        );
    }
}
