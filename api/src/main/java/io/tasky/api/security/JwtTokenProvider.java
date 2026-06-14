package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import io.tasky.api.domain.membership.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey secretKey;
    private final long expirationHours;

    public JwtTokenProvider(TaskYProperties properties) {
        byte[] keyBytes = Base64.getDecoder().decode(properties.jwt().secret());
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.expirationHours = properties.jwt().expirationHours();
    }

    public String createToken(UUID userId, String email, UUID orgId, Role role) {
        return createToken(userId, email, orgId, role, expirationHours);
    }

    public String createRefreshToken(UUID userId, String email, UUID orgId, Role role) {
        return createToken(userId, email, orgId, role, expirationHours * 7);
    }

    private String createToken(UUID userId, String email, UUID orgId, Role role, long hours) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(hours * 3600);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("org_id", orgId != null ? orgId.toString() : null)
                .claim("role", role != null ? role.name() : null)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(secretKey)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateTokenIgnoringExpiry(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
