package io.tasky.api.api.auth;

import io.tasky.api.api.auth.AuthRequest;
import io.tasky.api.api.auth.AuthResponse;
import io.tasky.api.api.auth.ApiKeyRequest;
import io.tasky.api.api.auth.ApiKeyResponse;
import io.tasky.api.api.auth.RefreshResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.GoogleTokenVerifier;
import io.tasky.api.security.JwtTokenProvider;
import io.tasky.api.security.SecurityUser;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final OrganizationMembershipRepository membershipRepository;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(@Valid @RequestBody AuthRequest request) {
        var payload = googleTokenVerifier.verify(request.idToken());

        User user = userService.getOrCreateUser(payload.email(), payload.sub(), payload.name(), payload.picture());

        List<OrganizationMembership> memberships = membershipRepository.findByUserId(user.getId());

        String token;
        AuthResponse.OrgInfo activeOrg = null;

        if (!memberships.isEmpty()) {
            var membership = memberships.getFirst();
            Organization org = membership.getOrganization();
            activeOrg = new AuthResponse.OrgInfo(
                    org.getId().toString(),
                    org.getName(),
                    org.getSlug(),
                    membership.getRole().name()
            );
            token = jwtTokenProvider.createToken(
                    user.getId(), user.getEmail(),
                    org.getId(), membership.getRole()
            );
        } else {
            token = jwtTokenProvider.createToken(
                    user.getId(), user.getEmail(),
                    null, null
            );
        }

        List<AuthResponse.OrgInfo> orgInfos = memberships.stream()
                .map(m -> new AuthResponse.OrgInfo(
                        m.getOrganization().getId().toString(),
                        m.getOrganization().getName(),
                        m.getOrganization().getSlug(),
                        m.getRole().name()
                ))
                .toList();

        var userInfo = new AuthResponse.UserInfo(
                user.getId().toString(),
                user.getEmail(),
                user.getUsername(),
                user.getDisplayName(),
                user.getAvatarUrl()
        );

        return ResponseEntity.ok()
                .body(new AuthResponse(token, userInfo, orgInfos));
    }

    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(@RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }

        String token = authHeader.substring(7);

        if (!jwtTokenProvider.validateTokenIgnoringExpiry(token)) {
            return ResponseEntity.status(401).build();
        }

        Claims claims = jwtTokenProvider.parseToken(token);
        UUID userId = UUID.fromString(claims.getSubject());
        String email = claims.get("email", String.class);
        String orgIdStr = claims.get("org_id", String.class);
        UUID orgId = orgIdStr != null ? UUID.fromString(orgIdStr) : null;
        String roleStr = claims.get("role", String.class);
        var role = roleStr != null ? io.tasky.api.domain.membership.Role.valueOf(roleStr) : null;

        String newToken = jwtTokenProvider.createToken(userId, email, orgId, role);
        return ResponseEntity.ok(new RefreshResponse(newToken));
    }

    @GetMapping("/me")
    public ResponseEntity<SecurityUser> me(@AuthenticationPrincipal SecurityUser user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(user);
    }
}
