package io.tasky.api.domain.activitytemplate;

import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.activity.ActivityStatus;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.project.Project;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityTemplateService {
    private final ActivityTemplateRepository templateRepository;
    private final ActivityTemplateVersionRepository versionRepository;
    private final ActivityRecurrenceRepository recurrenceRepository;
    private final ActivityRepository activityRepository;
    private final OrganizationMembershipRepository membershipRepository;

    @Transactional(readOnly = true)
    public List<ActivityTemplate> list(UUID organizationId, UUID projectId) {
        return templateRepository.findByProjectIdAndOrganizationIdOrderByNameAsc(projectId, organizationId);
    }

    public ActivityTemplateVersion createVersion(UUID organizationId, UUID sourceActivityId, UUID templateId,
                                                  String name, RecurrenceSpec recurrence,
                                                  OrganizationMembership creator) {
        Activity source = activityRepository
                .findByIdAndProject_Department_Organization_Id(sourceActivityId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        requireActiveAssignee(source.getAssignedTo(), organizationId);

        ActivityTemplate template;
        int versionNumber;
        if (templateId == null) {
            template = templateRepository.save(ActivityTemplate.builder()
                    .organizationId(organizationId)
                    .project(source.getProject())
                    .name(name.trim())
                    .createdBy(creator)
                    .build());
            versionNumber = 1;
        } else {
            template = get(organizationId, templateId);
            if (!template.getProject().getId().equals(source.getProject().getId())) {
                throw new IllegalArgumentException("Template and source activity must belong to the same project");
            }
            versionNumber = versionRepository.findTopByTemplateIdOrderByVersionNumberDesc(templateId)
                    .map(v -> v.getVersionNumber() + 1)
                    .orElse(1);
            recurrenceRepository.deactivateForTemplate(templateId);
        }

        long durationSeconds = Duration.between(source.getStartDatetime(), source.getEndDatetime()).getSeconds();
        ActivityTemplateVersion version = versionRepository.save(ActivityTemplateVersion.builder()
                .template(template)
                .versionNumber(versionNumber)
                .title(source.getTitle())
                .description(source.getDescription())
                .weight(source.getWeight())
                .durationSeconds(durationSeconds)
                .estimatedSeconds(source.getEstimatedSeconds())
                .assignedTo(source.getAssignedTo())
                .build());

        if (recurrence != null) {
            validateRecurrence(recurrence);
            recurrenceRepository.save(ActivityRecurrence.builder()
                    .templateVersion(version)
                    .organizationId(organizationId)
                    .project(source.getProject())
                    .frequency(recurrence.frequency())
                    .interval(recurrence.interval())
                    .timezone(recurrence.timezone())
                    .nextOccurrence(recurrence.nextOccurrence())
                    .active(true)
                    .build());
        }
        return version;
    }

    public Activity useLatest(UUID organizationId, UUID templateId, Instant occurrenceAt,
                              OrganizationMembership creator) {
        ActivityTemplate template = get(organizationId, templateId);
        ActivityTemplateVersion version = latestVersion(template.getId());
        return instantiate(template.getProject(), version, occurrenceAt, creator);
    }

    @Transactional(readOnly = true)
    public ActivityTemplate get(UUID organizationId, UUID templateId) {
        return templateRepository.findByIdAndOrganizationId(templateId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Activity template not found"));
    }

    @Transactional(readOnly = true)
    public ActivityTemplateVersion latestVersion(UUID templateId) {
        return versionRepository.findTopByTemplateIdOrderByVersionNumberDesc(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Activity template has no versions"));
    }

    @Transactional(readOnly = true)
    public ActivityRecurrence recurrence(ActivityTemplateVersion version) {
        return recurrenceRepository.findByTemplateVersionId(version.getId()).orElse(null);
    }

    Activity instantiate(Project project, ActivityTemplateVersion version, Instant occurrenceAt,
                         OrganizationMembership creator) {
        UUID organizationId = project.getDepartment().getOrganization().getId();
        if (!version.getTemplate().getOrganizationId().equals(organizationId)
                || !version.getTemplate().getProject().getId().equals(project.getId())) {
            throw new IllegalStateException("Template tenant or project does not match recurrence");
        }
        requireActiveAssignee(version.getAssignedTo(), organizationId);
        return activityRepository.save(Activity.builder()
                .project(project)
                .title(version.getTitle())
                .description(version.getDescription())
                .weight(version.getWeight())
                .startDatetime(occurrenceAt)
                .endDatetime(occurrenceAt.plusSeconds(version.getDurationSeconds()))
                .createdBy(creator)
                .assignedTo(version.getAssignedTo())
                .status(ActivityStatus.TODO)
                .position(activityRepository.maxPosition(project.getId(), ActivityStatus.TODO) + 1000)
                .estimatedSeconds(version.getEstimatedSeconds())
                .build());
    }

    private void requireActiveAssignee(OrganizationMembership assignee, UUID organizationId) {
        if (assignee == null || !assignee.getOrganization().getId().equals(organizationId)
                || membershipRepository.findById(assignee.getId()).filter(OrganizationMembership::isActive).isEmpty()) {
            throw new IllegalArgumentException("Template assignee must be an active member of the organization");
        }
    }

    private void validateRecurrence(RecurrenceSpec recurrence) {
        if (recurrence.interval() < 1) {
            throw new IllegalArgumentException("Recurrence interval must be positive");
        }
        if (!ZoneId.getAvailableZoneIds().contains(recurrence.timezone())) {
            throw new IllegalArgumentException("Recurrence timezone must be a valid IANA timezone");
        }
    }

    public record RecurrenceSpec(RecurrenceFrequency frequency, int interval, String timezone,
                                 Instant nextOccurrence) {}
}
