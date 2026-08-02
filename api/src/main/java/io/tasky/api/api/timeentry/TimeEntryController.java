package io.tasky.api.api.timeentry;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.Role;
import io.tasky.api.domain.timeentry.TimeEntry;
import io.tasky.api.domain.timeentry.TimeEntryService;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/time-entries")
@RequiredArgsConstructor
@Transactional
public class TimeEntryController {

    private final TimeEntryService timeEntryService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<TimeEntryResponse> start(
            @Valid @RequestBody StartTimeEntryRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.startEntry(
                user.activeOrganizationId(),
                membership,
                request.projectId(),
                request.activityId(),
                request.description(),
                request.billable() != null && request.billable(),
                request.tags()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(entry));
    }

    @PostMapping("/timer/start")
    public ResponseEntity<TimeEntryResponse> startTimer(
            @Valid @RequestBody StartTimeEntryRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.startEntry(
                user.activeOrganizationId(),
                membership,
                request.projectId(),
                request.activityId(),
                request.description(),
                request.billable() != null && request.billable(),
                request.tags()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(entry));
    }

    @PostMapping("/manual")
    public ResponseEntity<TimeEntryResponse> manual(
            @Valid @RequestBody ManualTimeEntryRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.manualEntry(
                user.activeOrganizationId(),
                membership,
                request.startTime(),
                request.endTime(),
                request.projectId(),
                request.activityId(),
                request.description(),
                request.billable() != null && request.billable(),
                request.tags()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(entry));
    }

    @GetMapping
    public ResponseEntity<PaginatedResponse<TimeEntryResponse>> list(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("projectId") Optional<UUID> projectId,
            @RequestParam("membershipId") Optional<UUID> membershipId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "1000") int size,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = user.activeOrganizationId();
        OrganizationMembership membership = currentMembership(user);

        boolean isOrgManager = permissionService.canManageOrganization(user, orgId)
                || membership.getRole() == Role.manager;

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 5000));
        if (isOrgManager && membershipId.isPresent()) {
            return ResponseEntity.ok(timeEntryService.getPage(
                    orgId, membershipId.get(), from.orElse(null), to.orElse(null), projectId.orElse(null), pageable));
        }
        return ResponseEntity.ok(timeEntryService.getPage(
                orgId, membership.getId(), from.orElse(null), to.orElse(null), projectId.orElse(null), pageable));
    }

    @GetMapping("/running")
    public ResponseEntity<TimeEntryResponse> running(@AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.getRunningEntry(user.activeOrganizationId(), membership.getId());
        if (entry == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(toResponse(entry));
    }

    @GetMapping("/org")
    @PreAuthorize("@access.isManagerOrAdminOfOrganization(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<PaginatedResponse<TimeEntryResponse>> listOrg(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "1000") int size,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = user.activeOrganizationId();
        OrganizationMembership membership = currentMembership(user);
        boolean isOrgManager = permissionService.canManageOrganization(user, orgId)
                || membership.getRole() == Role.manager;
        if (!isOrgManager) {
            throw new SecurityException("Only managers and admins can view organization time entries");
        }
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 5000));
        return ResponseEntity.ok(timeEntryService.getOrganizationPage(
                orgId, from.orElse(null), to.orElse(null), pageable));
    }

    @PatchMapping("/{entryId}/stop")
    public ResponseEntity<TimeEntryResponse> stop(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.stopEntry(user.activeOrganizationId(), membership.getId(), entryId);
        return ResponseEntity.ok(toResponse(entry));
    }

    @PatchMapping("/{entryId}/pause")
    public ResponseEntity<TimeEntryResponse> pause(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.pauseEntry(user.activeOrganizationId(), membership.getId(), entryId);
        return ResponseEntity.ok(toResponse(entry));
    }

    @PatchMapping("/{entryId}/resume")
    public ResponseEntity<TimeEntryResponse> resume(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.resumeEntry(user.activeOrganizationId(), membership.getId(), entryId);
        return ResponseEntity.ok(toResponse(entry));
    }

    @PatchMapping("/{entryId}/submit")
    public ResponseEntity<TimeEntryResponse> submit(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.submitEntry(user.activeOrganizationId(), membership.getId(), entryId);
        return ResponseEntity.ok(toResponse(entry));
    }

    @PatchMapping("/{entryId}/approve")
    @PreAuthorize("@access.canViewOrganizationReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<TimeEntryResponse> approve(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.approveEntry(user.activeOrganizationId(), entryId, membership);
        return ResponseEntity.ok(toResponse(entry));
    }

    @PatchMapping("/{entryId}/reject")
    @PreAuthorize("@access.canViewOrganizationReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<TimeEntryResponse> reject(
            @PathVariable UUID entryId,
            @RequestBody RejectTimeEntryRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.rejectEntry(user.activeOrganizationId(), entryId, membership, request.comment());
        return ResponseEntity.ok(toResponse(entry));
    }

    @PutMapping("/{entryId}")
    public ResponseEntity<TimeEntryResponse> update(
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateTimeEntryRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        TimeEntry entry = timeEntryService.updateEntry(
                user.activeOrganizationId(), membership.getId(), entryId,
                request.projectId(), request.activityId(), request.description(),
                request.startTime(), request.endTime(), request.billable(), request.tags()
        );
        return ResponseEntity.ok(toResponse(entry));
    }

    @DeleteMapping("/{entryId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID entryId,
            @AuthenticationPrincipal SecurityUser user) {

        OrganizationMembership membership = currentMembership(user);
        timeEntryService.deleteEntry(user.activeOrganizationId(), membership.getId(), entryId);
        return ResponseEntity.noContent().build();
    }

    private OrganizationMembership currentMembership(SecurityUser user) {
        return permissionService.getMembership(user.id(), user.activeOrganizationId())
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
    }

    private TimeEntryResponse toResponse(TimeEntry entry) {
        return new TimeEntryResponse(
                entry.getId(),
                entry.getOrganization().getId(),
                entry.getMembership().getId(),
                entry.getMembership().getUser().getId(),
                entry.getProject() != null ? entry.getProject().getId() : null,
                entry.getActivity() != null ? entry.getActivity().getId() : null,
                entry.getDescription(),
                entry.getStartTime(),
                entry.getEndTime(),
                entry.getDurationSeconds(),
                entry.getPausedSeconds(),
                entry.getPausedAt(),
                entry.getApprovalStatus(),
                entry.getSubmittedAt(),
                entry.getApprovedAt(),
                entry.getApprovedBy() != null ? entry.getApprovedBy().getId() : null,
                entry.getRejectionComment(),
                entry.getBillingRateSnapshot(),
                entry.getCostRateSnapshot(),
                entry.isBillable(),
                new java.util.ArrayList<>(entry.getTags()),
                entry.getCreatedAt()
        );
    }
}
