package io.tasky.api.security;

import io.tasky.api.config.TaskYProperties;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.user.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Grants the platform super-admin role to memberships whose e-mail is listed
 * in the TASKY_SUPER_ADMINS environment variable. It only ever promotes: it
 * never demotes a membership that leaves the list (revoking access must be an
 * intentional platform operation).
 */
@Service
@RequiredArgsConstructor
public class SuperAdminService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminService.class);

    private final TaskYProperties properties;
    private final OrganizationMembershipRepository membershipRepository;

    private volatile Set<String> allowedEmails = Set.of();

    public Set<String> allowedEmails() {
        return allowedEmails;
    }

    @Override
    public void run(ApplicationArguments args) {
        refresh();
        if (!allowedEmails.isEmpty()) {
            int promoted = ensureSuperAdminForAll();
            log.info("Super admin bootstrap: {} e-mails configured, {} memberships promoted",
                    allowedEmails.size(), promoted);
        }
    }

    public void refresh() {
        Set<String> emails = new HashSet<>();
        if (properties.platform() != null && properties.platform().superAdminEmails() != null) {
            properties.platform().superAdminEmails().stream()
                    .filter(email -> email != null && !email.isBlank())
                    .map(email -> email.trim().toLowerCase(Locale.ROOT))
                    .forEach(emails::add);
        }
        this.allowedEmails = Collections.unmodifiableSet(emails);
    }

    @Transactional
    public void ensureSuperAdmin(User user) {
        if (user == null || !allowedEmails.contains(user.getEmail().toLowerCase(Locale.ROOT))) {
            return;
        }
        int promoted = 0;
        for (OrganizationMembership membership : membershipRepository.findByUserIdAndIsActiveTrue(user.getId())) {
            if (membership.getRole() != Role.super_admin) {
                membership.setRole(Role.super_admin);
                membershipRepository.save(membership);
                promoted++;
            }
        }
        if (promoted > 0) {
            log.info("Promoted {} memberships of {} to super admin", promoted, user.getEmail());
        }
    }

    @Transactional
    public int ensureSuperAdminForAll() {
        int promoted = 0;
        for (String email : allowedEmails) {
            promoted += membershipRepository.findByUserEmailIgnoreCaseAndIsActiveTrue(email).stream()
                    .filter(membership -> membership.getRole() != Role.super_admin)
                    .map(membership -> {
                        membership.setRole(Role.super_admin);
                        membershipRepository.save(membership);
                        return 1;
                    })
                    .mapToInt(Integer::intValue)
                    .sum();
        }
        return promoted;
    }
}
