package io.tasky.api.domain.timeentry;

import io.tasky.api.api.common.ConflictException;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.organization.Organization;
import io.tasky.api.domain.organization.OrganizationRepository;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeEntryServiceTest {
    @Mock private TimeEntryRepository timeEntryRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private ActivityRepository activityRepository;
    @Mock private AuditService auditService;
    @InjectMocks private TimeEntryService service;

    @Test
    void updateSubmittedEntry_isRejectedBeforeMutation() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.SUBMITTED, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));

        assertThrows(ConflictException.class, () -> service.updateEntry(
                fixture.orgId, fixture.membershipId, fixture.entry.getId(), null, null,
                "changed", null, null, null, null, null));

        verify(timeEntryRepository, never()).save(fixture.entry);
    }

    @Test
    void ownerCanDeleteDraftEntry() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));

        service.deleteEntry(fixture.orgId, fixture.membershipId, fixture.entry.getId());

        verify(timeEntryRepository).delete(fixture.entry);
    }

    @Test
    void ownerCannotDeleteApprovedEntry() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.APPROVED, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));

        assertThrows(ConflictException.class, () -> service.deleteEntry(
                fixture.orgId, fixture.membershipId, fixture.entry.getId()));

        verify(timeEntryRepository, never()).delete(fixture.entry);
    }

    @Test
    void approveDraftEntry_isRejected() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));

        assertThrows(ConflictException.class,
                () -> service.approveEntry(fixture.orgId, fixture.entry.getId(), fixture.membership));
    }

    @Test
    void rejectRunningSubmittedEntry_isRejected() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.SUBMITTED, null);
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));

        assertThrows(ConflictException.class,
                () -> service.rejectEntry(fixture.orgId, fixture.entry.getId(), fixture.membership, "fix it"));
    }

    @Test
    void updateProjectThatDoesNotMatchExistingActivity_isRejected() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        Project otherProject = Project.builder().id(UUID.randomUUID()).build();
        fixture.entry.setProject(fixture.project);
        fixture.entry.setActivity(Activity.builder().id(UUID.randomUUID()).project(fixture.project).build());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId())).thenReturn(Optional.of(fixture.entry));
        when(projectRepository.findByIdAndDepartment_Organization_Id(otherProject.getId(), fixture.orgId))
                .thenReturn(Optional.of(otherProject));

        assertThrows(IllegalArgumentException.class, () -> service.updateEntry(
                fixture.orgId, fixture.membershipId, fixture.entry.getId(), otherProject.getId(), null,
                null, null, null, null, null, null));
    }

    @Test
    void updateStaleVersion_isRejected() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId()))
                .thenReturn(Optional.of(fixture.entry));

        assertThrows(ConflictException.class, () -> service.updateEntry(
                fixture.orgId, fixture.membershipId, fixture.entry.getId(), null, null,
                "changed", null, null, null, null, 7L));

        verify(timeEntryRepository, never()).save(fixture.entry);
    }

    @Test
    void updateMatchingVersion_succeeds() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId()))
                .thenReturn(Optional.of(fixture.entry));

        service.updateEntry(fixture.orgId, fixture.membershipId, fixture.entry.getId(), null, null,
                "changed", null, null, null, null, 0L);

        verify(timeEntryRepository).save(fixture.entry);
    }

    @Test
    void updatePreservesPausedSeconds() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.parse("2026-04-01T09:00:00Z"));
        fixture.entry.setStartTime(Instant.parse("2026-04-01T08:00:00Z"));
        fixture.entry.setPausedSeconds(600);
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId()))
                .thenReturn(Optional.of(fixture.entry));

        service.updateEntry(fixture.orgId, fixture.membershipId, fixture.entry.getId(), null, null,
                null, null, null, Instant.parse("2026-04-01T10:00:00Z"), null, null);

        // wall 08:00-10:00 = 7200s minus 600s pause
        verify(timeEntryRepository).save(org.mockito.ArgumentMatchers.argThat(entry ->
                entry.getDurationSeconds() == 6600L));
    }

    @Test
    void updateReassignProject_refreshesBillingSnapshotAndAudits() {
        Fixture fixture = fixture(TimeEntryApprovalStatus.DRAFT, Instant.now());
        fixture.entry.setBillingRateSnapshot(new java.math.BigDecimal("100.00"));
        io.tasky.api.domain.user.User user = io.tasky.api.domain.user.User.builder()
                .id(UUID.randomUUID()).build();
        fixture.membership.setUser(user);
        Project newProject = Project.builder().id(UUID.randomUUID())
                .hourlyRate(new java.math.BigDecimal("200.00")).build();
        when(timeEntryRepository.findByOrganizationIdAndId(fixture.orgId, fixture.entry.getId()))
                .thenReturn(Optional.of(fixture.entry));
        when(projectRepository.findByIdAndDepartment_Organization_Id(newProject.getId(), fixture.orgId))
                .thenReturn(Optional.of(newProject));

        service.updateEntry(fixture.orgId, fixture.membershipId, fixture.entry.getId(),
                newProject.getId(), null, null, null, null, null, null, null);

        org.junit.jupiter.api.Assertions.assertEquals(new java.math.BigDecimal("200.00"),
                fixture.entry.getBillingRateSnapshot());
        verify(auditService).record(
                org.mockito.ArgumentMatchers.eq(fixture.orgId),
                org.mockito.ArgumentMatchers.eq(user.getId()),
                org.mockito.ArgumentMatchers.eq(fixture.membershipId),
                org.mockito.ArgumentMatchers.eq("time_entry"),
                org.mockito.ArgumentMatchers.eq(fixture.entry.getId()),
                org.mockito.ArgumentMatchers.eq("REASSIGN"),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.isNull());
    }

    private Fixture fixture(TimeEntryApprovalStatus status, Instant endTime) {
        UUID orgId = UUID.randomUUID();
        UUID membershipId = UUID.randomUUID();
        Organization organization = Organization.builder().id(orgId).build();
        OrganizationMembership membership = OrganizationMembership.builder()
                .id(membershipId)
                .organization(organization)
                .build();
        Project project = Project.builder().id(UUID.randomUUID()).build();
        TimeEntry entry = TimeEntry.builder()
                .id(UUID.randomUUID())
                .organization(organization)
                .membership(membership)
                .project(project)
                .startTime(Instant.now().minusSeconds(60))
                .endTime(endTime)
                .approvalStatus(status)
                .build();
        return new Fixture(orgId, membershipId, membership, project, entry);
    }

    private record Fixture(UUID orgId, UUID membershipId, OrganizationMembership membership,
                           Project project, TimeEntry entry) {}
}
