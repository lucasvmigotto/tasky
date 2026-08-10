package io.tasky.api.api.activitytemplate;

import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activitytemplate.ActivityRecurrence;
import io.tasky.api.domain.activitytemplate.ActivityTemplate;
import io.tasky.api.domain.activitytemplate.ActivityTemplateService;
import io.tasky.api.domain.activitytemplate.ActivityTemplateVersion;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Transactional
public class ActivityTemplateController {
    private final ActivityTemplateService templateService;
    private final PermissionService permissionService;

    @GetMapping("/projects/{projectId}/activity-templates")
    public List<ActivityTemplateResponse> list(@PathVariable UUID projectId,
                                                @AuthenticationPrincipal SecurityUser user) {
        UUID organizationId = requiredOrgId(user);
        if (!permissionService.canReadProject(user, projectId)) {
            throw new SecurityException("Project not found");
        }
        return templateService.list(organizationId, projectId).stream().map(this::toResponse).toList();
    }

    @PostMapping("/activities/{activityId}/templates")
    @PreAuthorize("@access.canManageActivity(authentication.principal, #activityId)")
    public ResponseEntity<ActivityTemplateResponse> create(
            @PathVariable UUID activityId,
            @Valid @RequestBody CreateActivityTemplateRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID organizationId = requiredOrgId(user);
        OrganizationMembership creator = membership(user, organizationId);
        var recurrence = request.recurrence() == null ? null : new ActivityTemplateService.RecurrenceSpec(
                request.recurrence().frequency(), request.recurrence().interval(),
                request.recurrence().timezone(), request.recurrence().nextOccurrence());
        ActivityTemplateVersion version = templateService.createVersion(
                organizationId, activityId, request.templateId(), request.name(), recurrence, creator);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(version.getTemplate(), version));
    }

    @PostMapping("/activity-templates/{templateId}/use")
    public ResponseEntity<GeneratedActivityResponse> use(
            @PathVariable UUID templateId,
            @Valid @RequestBody UseActivityTemplateRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID organizationId = requiredOrgId(user);
        ActivityTemplate template = templateService.get(organizationId, templateId);
        if (!permissionService.canManageProject(user, template.getProject().getId())) {
            throw new SecurityException("Activity template not found");
        }
        Activity activity = templateService.useLatest(
                organizationId, templateId, request.occurrenceAt(), membership(user, organizationId));
        return ResponseEntity.status(HttpStatus.CREATED).body(new GeneratedActivityResponse(
                activity.getId(), activity.getProject().getId(),
                activity.getStartDatetime(), activity.getEndDatetime()));
    }

    private ActivityTemplateResponse toResponse(ActivityTemplate template) {
        return toResponse(template, templateService.latestVersion(template.getId()));
    }

    private ActivityTemplateResponse toResponse(ActivityTemplate template, ActivityTemplateVersion version) {
        ActivityRecurrence recurrence = templateService.recurrence(version);
        ActivityTemplateResponse.RecurrenceResponse recurrenceResponse = recurrence == null ? null
                : new ActivityTemplateResponse.RecurrenceResponse(
                        recurrence.getId(), recurrence.getFrequency(), recurrence.getInterval(),
                        recurrence.getTimezone(), recurrence.getNextOccurrence(), recurrence.isActive());
        return new ActivityTemplateResponse(
                template.getId(), template.getProject().getId(), template.getName(), version.getVersionNumber(),
                version.getTitle(), version.getDescription(), version.getWeight(), version.getDurationSeconds(),
                version.getEstimatedSeconds(), version.getAssignedTo().getId(), recurrenceResponse,
                template.getCreatedAt());
    }

    private OrganizationMembership membership(SecurityUser user, UUID organizationId) {
        return permissionService.getMembership(user.id(), organizationId)
                .orElseThrow(() -> new SecurityException("Not an active member of this organization"));
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }
}
