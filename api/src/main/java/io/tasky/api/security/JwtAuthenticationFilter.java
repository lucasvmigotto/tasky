package io.tasky.api.security;

import io.jsonwebtoken.Claims;
import io.tasky.api.domain.membership.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtTokenProvider.validateToken(token)) {
                Claims claims = jwtTokenProvider.parseToken(token);

                SecurityUser securityUser = SecurityUser.builder()
                        .id(UUID.fromString(claims.getSubject()))
                        .email(claims.get("email", String.class))
                        .activeOrganizationId(
                                claims.get("org_id", String.class) != null
                                        ? UUID.fromString(claims.get("org_id", String.class))
                                        : null
                        )
                        .role(getRole(claims))
                        .build();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                securityUser, null, List.of()
                        );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        chain.doFilter(request, response);
    }

    private Role getRole(Claims claims) {
        String roleStr = claims.get("role", String.class);
        return roleStr != null ? Role.valueOf(roleStr) : null;
    }
}
