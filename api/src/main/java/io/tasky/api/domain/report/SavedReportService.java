package io.tasky.api.domain.report;

import io.tasky.api.api.report.CreateSavedReportRequest;
import io.tasky.api.api.report.SavedReportResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavedReportService {

    private final SavedReportRepository savedReportRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public SavedReportResponse create(UUID orgId, UUID ownerMembershipId, CreateSavedReportRequest request) {
        OrganizationMembership owner = requireActiveMembership(orgId, ownerMembershipId);
        SavedReport report = SavedReport.builder()
                .organization(organizationRepository.getReferenceById(orgId))
                .owner(owner)
                .name(request.name().trim())
                .description(request.description())
                .params(request.params() != null ? new LinkedHashMap<>(request.params()) : new LinkedHashMap<>())
                .build();
        return toResponse(savedReportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public SavedReportResponse get(UUID orgId, UUID callerMembershipId, boolean admin, UUID reportId) {
        SavedReport report = savedReportRepository.findByIdAndOrganizationId(reportId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Saved report not found"));
        requireAccess(callerMembershipId, admin, report);
        return toResponse(report);
    }

    @Transactional(readOnly = true)
    public List<SavedReportResponse> list(UUID orgId, UUID callerMembershipId, boolean admin) {
        List<SavedReport> reports = admin
                ? savedReportRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId)
                : savedReportRepository.findByOrganizationIdAndOwner_IdOrderByCreatedAtDesc(orgId, callerMembershipId);
        return reports.stream().map(this::toResponse).toList();
    }

    private OrganizationMembership requireActiveMembership(UUID orgId, UUID membershipId) {
        return membershipRepository.findByIdAndOrganizationIdAndIsActiveTrue(membershipId, orgId)
                .orElseThrow(() -> new SecurityException("Not an active member of this organization"));
    }

    private void requireAccess(UUID callerMembershipId, boolean admin, SavedReport report) {
        if (!admin && !report.getOwner().getId().equals(callerMembershipId)) {
            throw new SecurityException("You do not have access to this saved report");
        }
    }

    private SavedReportResponse toResponse(SavedReport report) {
        return new SavedReportResponse(
                report.getId(),
                report.getName(),
                report.getDescription(),
                new LinkedHashMap<>(report.getParams()),
                report.getCreatedAt(),
                report.getUpdatedAt(),
                report.getVersion());
    }
}
