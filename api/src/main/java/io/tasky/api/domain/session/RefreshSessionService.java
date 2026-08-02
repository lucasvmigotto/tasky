package io.tasky.api.domain.session;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.user.User;
import io.tasky.api.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RefreshSessionService {

    private static final long REFRESH_HOURS = 24L * 14;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final PlatformTransactionManager transactionManager;

    private TransactionTemplate newRequiresNewTransaction() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }

    public CreatedSession create(User user, Organization org, String ip) {
        String raw = generateRawToken();
        RefreshSession session = RefreshSession.builder()
                .user(user)
                .organization(org)
                .tokenHash(hash(raw))
                .familyId(UUID.randomUUID())
                .expiresAt(Instant.now().plusSeconds(REFRESH_HOURS * 3600))
                .createdIp(ip)
                .build();
        sessionRepository.save(session);
        return new CreatedSession(raw, session);
    }

    public RefreshResult rotate(String rawToken, String ip) {
        RefreshSession session = sessionRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new SecurityException("Invalid refresh session"));

        if (session.getRevokedAt() != null) {
            if (session.getReplacedBy() != null) {
                revokeFamilyCommitted(session.getFamilyId());
            }
            throw new SecurityException("Refresh session has been revoked");
        }
        if (session.getExpiresAt().isBefore(Instant.now())) {
            revokeFamilyCommitted(session.getFamilyId());
            throw new SecurityException("Refresh session has expired");
        }
        User user = userRepository.findById(session.getUser().getId())
                .filter(User::isActive)
                .orElseThrow(() -> new SecurityException("User is not active"));
        Organization org = session.getOrganization();
        OrganizationMembership membership = null;
        if (org != null) {
            membership = membershipRepository
                    .findByUserIdAndOrganizationIdAndIsActiveTrue(user.getId(), org.getId())
                    .orElseThrow(() -> new SecurityException("Membership no longer valid"));
        }

        String newRaw = generateRawToken();
        RefreshSession replacement = RefreshSession.builder()
                .user(user)
                .organization(org)
                .tokenHash(hash(newRaw))
                .familyId(session.getFamilyId())
                .expiresAt(Instant.now().plusSeconds(REFRESH_HOURS * 3600))
                .createdIp(ip)
                .build();
        replacement = sessionRepository.save(replacement);

        session.setRevokedAt(Instant.now());
        session.setReplacedBy(replacement.getId());

        return new RefreshResult(newRaw, user, org, membership);
    }

    public void revoke(String rawToken) {
        sessionRepository.findByTokenHash(hash(rawToken))
                .filter(s -> s.getRevokedAt() == null)
                .ifPresent(s -> {
                    s.setRevokedAt(Instant.now());
                    sessionRepository.save(s);
                });
    }

    public RefreshResult switchOrg(String rawToken, Organization org, String ip) {
        RefreshSession session = sessionRepository.findByTokenHash(hash(rawToken))
                .filter(s -> s.getRevokedAt() == null)
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new SecurityException("Invalid refresh session"));

        User user = userRepository.findById(session.getUser().getId())
                .filter(User::isActive)
                .orElseThrow(() -> new SecurityException("User is not active"));

        OrganizationMembership membership = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(user.getId(), org.getId())
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        String newRaw = generateRawToken();
        RefreshSession replacement = RefreshSession.builder()
                .user(user)
                .organization(org)
                .tokenHash(hash(newRaw))
                .familyId(session.getFamilyId())
                .expiresAt(Instant.now().plusSeconds(REFRESH_HOURS * 3600))
                .createdIp(ip)
                .build();
        replacement = sessionRepository.save(replacement);

        session.setRevokedAt(Instant.now());
        session.setReplacedBy(replacement.getId());

        return new RefreshResult(newRaw, user, org, membership);
    }

    public void revokeAllForUser(UUID userId) {
        sessionRepository.findByUserId(userId).stream()
                .filter(s -> s.getRevokedAt() == null)
                .forEach(s -> {
                    s.setRevokedAt(Instant.now());
                    sessionRepository.save(s);
                });
    }

    public void revokeFamily(UUID familyId) {
        sessionRepository.findByFamilyId(familyId).stream()
                .filter(s -> s.getRevokedAt() == null)
                .forEach(s -> {
                    s.setRevokedAt(Instant.now());
                    sessionRepository.save(s);
                });
    }

    private void revokeFamilyCommitted(UUID familyId) {
        newRequiresNewTransaction().executeWithoutResult(status -> revokeFamily(familyId));
    }

    public static String generateRawToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public record CreatedSession(String rawToken, RefreshSession session) {}

    public record RefreshResult(String rawToken, User user, Organization org, OrganizationMembership membership) {}
}
