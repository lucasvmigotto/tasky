package io.tasky.api.domain.organization;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.zone.ZoneRulesException;

@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public Organization createOrganization(String name, String slug, User creator) {
        return createOrganization(name, slug, null, creator);
    }

    public Organization createOrganization(String name, String slug, String timezone, User creator) {
        if (organizationRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Organization slug already taken");
        }

        String effectiveTimezone = validateTimezone(timezone != null && !timezone.isBlank() ? timezone : "UTC");

        Organization org = Organization.builder()
                .name(name)
                .slug(slug)
                .timezone(effectiveTimezone)
                .build();
        org = organizationRepository.save(org);

        OrganizationMembership adminMembership = OrganizationMembership.builder()
                .user(creator)
                .organization(org)
                .role(Role.admin)
                .maxDailyWorkMinutes(480)
                .build();
        membershipRepository.save(adminMembership);

        return org;
    }

    private String validateTimezone(String timezone) {
        try {
            return ZoneId.of(timezone).getId();
        } catch (ZoneRulesException e) {
            throw new IllegalArgumentException("Invalid timezone");
        }
    }
}
