package io.tasky.api.domain.label;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LabelService {

    private final LabelRepository labelRepository;
    private final OrganizationRepository organizationRepository;

    public Label createLabel(UUID organizationId, String slug, String displayName, OrganizationMembership creator) {
        if (labelRepository.existsByOrganizationIdAndSlug(organizationId, slug)) {
            throw new IllegalArgumentException("Label slug already exists in this organization");
        }
        Organization org = organizationRepository.getReferenceById(organizationId);
        Label label = Label.builder()
                .organization(org)
                .slug(slug)
                .displayName(displayName)
                .isSystem(false)
                .createdBy(creator)
                .build();
        return labelRepository.save(label);
    }

    public List<Label> getLabelsByOrganization(UUID organizationId) {
        return labelRepository.findByOrganizationId(organizationId);
    }

    public void deleteLabel(UUID organizationId, UUID labelId) {
        Label label = labelRepository.findByIdAndOrganizationId(labelId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Label not found"));
        if (label.isSystem()) {
            throw new IllegalArgumentException("Cannot delete system labels");
        }
        labelRepository.delete(label);
    }

    public Label updateLabel(UUID organizationId, UUID labelId, String slug, String displayName) {
        Label label = labelRepository.findByIdAndOrganizationId(labelId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Label not found"));

        if (slug != null && !slug.isBlank() && !slug.equals(label.getSlug())) {
            if (label.isSystem()) {
                throw new IllegalArgumentException("Cannot change the slug of system labels");
            }
            if (labelRepository.existsByOrganizationIdAndSlug(organizationId, slug)) {
                throw new IllegalArgumentException("Label slug already exists in this organization");
            }
            label.setSlug(slug);
        }
        if (displayName != null && !displayName.isBlank()) {
            label.setDisplayName(displayName);
        }
        return labelRepository.save(label);
    }
}
