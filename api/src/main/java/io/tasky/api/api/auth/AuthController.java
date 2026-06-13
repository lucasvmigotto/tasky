package io.tasky.api.api.auth;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.GoogleTokenVerifier;
import io.tasky.api.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import java.util.List;

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

        return ResponseEntity.ok(new AuthResponse(token, userInfo, orgInfos));
    }
}
