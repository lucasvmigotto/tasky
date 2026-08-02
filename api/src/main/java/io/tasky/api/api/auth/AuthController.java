package io.tasky.api.api.auth;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.MembershipService;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.session.RefreshSessionService;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserService;
import io.tasky.api.security.GoogleTokenVerifier;
import io.tasky.api.security.JwtTokenProvider;
import io.tasky.api.security.SecurityUser;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String REFRESH_COOKIE = "tasky_refresh";

    private final GoogleTokenVerifier googleTokenVerifier;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final OrganizationMembershipRepository membershipRepository;
    private final MembershipService membershipService;
    private final RefreshSessionService refreshSessionService;
    private final Environment environment;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(
            @Valid @RequestBody AuthRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        var payload = googleTokenVerifier.verify(request.idToken());

        User user = userService.getOrCreateUser(payload.email(), payload.sub(), payload.name(), payload.picture());
        membershipService.acceptPendingInvitations(user, payload.email());

        List<OrganizationMembership> memberships = membershipRepository.findByUserIdAndIsActiveTrue(user.getId());

        String token;
        AuthResponse.OrgInfo activeOrg = null;
        Organization sessionOrg = null;

        if (!memberships.isEmpty()) {
            var membership = memberships.getFirst();
            Organization org = membership.getOrganization();
            activeOrg = new AuthResponse.OrgInfo(
                    org.getId().toString(),
                    org.getName(),
                    org.getSlug(),
                    membership.getRole().name(),
                    effectiveTimezone(membership),
                    org.getWorkWeekStartsOn()
            );
            sessionOrg = org;
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

        var created = refreshSessionService.create(user, sessionOrg, clientIp(httpRequest));
        setRefreshCookie(httpResponse, created.rawToken());

        List<AuthResponse.OrgInfo> orgInfos = memberships.stream()
                .map(m -> new AuthResponse.OrgInfo(
                        m.getOrganization().getId().toString(),
                        m.getOrganization().getName(),
                        m.getOrganization().getSlug(),
                        m.getRole().name(),
                        effectiveTimezone(m),
                        m.getOrganization().getWorkWeekStartsOn()
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
    public ResponseEntity<RefreshResponse> refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawToken = readRefreshCookie(httpRequest);
        if (rawToken == null) {
            return ResponseEntity.status(401).build();
        }

        RefreshSessionService.RefreshResult result;
        try {
            result = refreshSessionService.rotate(rawToken, clientIp(httpRequest));
        } catch (SecurityException e) {
            clearRefreshCookie(httpResponse);
            return ResponseEntity.status(401).build();
        }

        setRefreshCookie(httpResponse, result.rawToken());

        String token;
        if (result.org() != null && result.membership() != null) {
            token = jwtTokenProvider.createToken(
                    result.user().getId(), result.user().getEmail(),
                    result.org().getId(), result.membership().getRole());
        } else {
            token = jwtTokenProvider.createToken(
                    result.user().getId(), result.user().getEmail(), null, null);
        }
        List<OrganizationMembership> memberships = membershipRepository.findByUserIdAndIsActiveTrue(result.user().getId());
        List<AuthResponse.OrgInfo> organizations = memberships.stream()
                .map(membership -> new AuthResponse.OrgInfo(
                        membership.getOrganization().getId().toString(),
                        membership.getOrganization().getName(),
                        membership.getOrganization().getSlug(),
                        membership.getRole().name(),
                        effectiveTimezone(membership),
                        membership.getOrganization().getWorkWeekStartsOn()))
                .toList();
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
                result.user().getId().toString(),
                result.user().getEmail(),
                result.user().getUsername(),
                result.user().getDisplayName(),
                result.user().getAvatarUrl());
        return ResponseEntity.ok(new RefreshResponse(
                token,
                userInfo,
                organizations,
                result.org() != null ? result.org().getId().toString() : null));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawToken = readRefreshCookie(httpRequest);
        if (rawToken != null) {
            refreshSessionService.revoke(rawToken);
        }
        clearRefreshCookie(httpResponse);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<SecurityUser> me(@AuthenticationPrincipal SecurityUser user) {
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/switch-org")
    public ResponseEntity<SwitchOrgResponse> switchOrg(
            @Valid @RequestBody SwitchOrgRequest request,
            @AuthenticationPrincipal SecurityUser user,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String rawToken = readRefreshCookie(httpRequest);
        if (rawToken == null) {
            return ResponseEntity.status(401).build();
        }

        OrganizationMembership membership = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), request.orgId())
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        Organization org = membership.getOrganization();

        RefreshSessionService.RefreshResult result;
        try {
            result = refreshSessionService.switchOrg(rawToken, org, clientIp(httpRequest));
        } catch (SecurityException e) {
            clearRefreshCookie(httpResponse);
            return ResponseEntity.status(401).build();
        }
        setRefreshCookie(httpResponse, result.rawToken());

        String token = jwtTokenProvider.createToken(
                user.id(), user.email(), org.getId(), membership.getRole());

        var orgInfo = new AuthResponse.OrgInfo(
                org.getId().toString(),
                org.getName(),
                org.getSlug(),
                membership.getRole().name(),
                effectiveTimezone(membership),
                org.getWorkWeekStartsOn()
        );
        return ResponseEntity.ok(new SwitchOrgResponse(token, orgInfo));
    }

    private String effectiveTimezone(OrganizationMembership membership) {
        return membership.getTimezone() != null ? membership.getTimezone() : membership.getOrganization().getTimezone();
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        boolean secure = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        Cookie cookie = new Cookie(REFRESH_COOKIE, rawToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(secure);
        cookie.setPath("/");
        cookie.setMaxAge((int) (14 * 24 * 3600));
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(Arrays.asList(environment.getActiveProfiles()).contains("prod"));
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private String readRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
