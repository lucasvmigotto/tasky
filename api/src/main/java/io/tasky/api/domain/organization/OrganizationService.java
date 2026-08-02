package io.tasky.api.domain.organization;

import io.tasky.api.domain.label.Label;
import io.tasky.api.domain.label.LabelRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.zone.ZoneRulesException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final LabelRepository labelRepository;

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

        seedSystemLabels(org.getId());

        return org;
    }

    private String validateTimezone(String timezone) {
        try {
            return ZoneId.of(timezone).getId();
        } catch (ZoneRulesException e) {
            throw new IllegalArgumentException("Invalid timezone");
        }
    }

    private void seedSystemLabels(UUID orgId) {
        var org = organizationRepository.getReferenceById(orgId);
        var labels = List.of(
                java.util.Map.of("slug", "urgent", "display", "Urgent"),
                java.util.Map.of("slug", "idea", "display", "Idea"),
                java.util.Map.of("slug", "feature", "display", "Feature"),
                java.util.Map.of("slug", "fix", "display", "Fix"),
                java.util.Map.of("slug", "routine", "display", "Routine")
        );
        for (var l : labels) {
            if (!labelRepository.existsByOrganizationIdAndSlug(orgId, l.get("slug"))) {
                var label = Label.builder()
                        .organization(org)
                        .slug(l.get("slug"))
                        .displayName(l.get("display"))
                        .isSystem(true)
                        .build();
                labelRepository.save(label);
            }
        }
    }
}
