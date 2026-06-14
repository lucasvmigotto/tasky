package io.tasky.api.api.activity;

import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityDependencyRepository;
import io.tasky.api.domain.activity.ActivityService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;
    private final ActivityDependencyRepository dependencyRepository;

    @PostMapping("/projects/{projectId}/activities")
    public ResponseEntity<ActivityResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateActivityRequest request,
            @AuthenticationPrincipal SecurityUser user) {

        Activity activity = activityService.createActivity(
                projectId,
                request.title(),
                request.description(),
                request.weight(),
                request.startDatetime(),
                request.endDatetime(),
                request.assignedToMembershipId(),
                request.labelIds(),
                request.parentActivityIds(),
                user
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(activity));
    }

    @GetMapping("/projects/{projectId}/activities")
    public ResponseEntity<List<ActivityResponse>> listByProject(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal SecurityUser user) {
        List<Activity> activities = activityService.getActivitiesByProject(projectId);
        return ResponseEntity.ok(activities.stream().map(this::toResponse).toList());
    }

    @GetMapping("/activities/{activityId}")
    public ResponseEntity<ActivityResponse> getById(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        Activity activity = activityService.getActivity(activityId);
        return ResponseEntity.ok(toResponse(activity));
    }

    @GetMapping("/activities")
    public ResponseEntity<List<ActivityResponse>> query(
            @RequestParam("from") Optional<Instant> from,
            @RequestParam("to") Optional<Instant> to,
            @RequestParam("assignedTo") Optional<UUID> assignedTo,
            @RequestParam("projectId") Optional<UUID> projectId,
            @AuthenticationPrincipal SecurityUser user) {
        List<Activity> activities = activityService.getActivitiesByDateRange(
                from.orElse(null), to.orElse(null),
                assignedTo.orElse(null), projectId.orElse(null));
        return ResponseEntity.ok(activities.stream().map(this::toResponse).toList());
    }

    @DeleteMapping("/activities/{activityId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        activityService.deleteActivity(activityId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/activities/{childId}/dependencies")
    public ResponseEntity<Void> addDependency(
            @PathVariable UUID childId,
            @Valid @RequestBody AddDependencyRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        activityService.addDependency(childId, request.parentActivityId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/activities/{childId}/dependencies/{parentId}")
    public ResponseEntity<Void> removeDependency(
            @PathVariable UUID childId,
            @PathVariable UUID parentId,
            @AuthenticationPrincipal SecurityUser user) {
        activityService.removeDependency(childId, parentId);
        return ResponseEntity.noContent().build();
    }

    private ActivityResponse toResponse(Activity activity) {
        List<UUID> labelIds = activity.getLabels().stream()
                .map(al -> al.getLabel().getId())
                .toList();

        List<UUID> parentIds = dependencyRepository.findByChildActivityId(activity.getId())
                .stream()
                .map(d -> d.getParentActivity().getId())
                .toList();

        return new ActivityResponse(
                activity.getId(),
                activity.getProject().getId(),
                activity.getTitle(),
                activity.getDescription(),
                activity.getWeight(),
                activity.getStartDatetime(),
                activity.getEndDatetime(),
                activity.getCreatedBy().getId(),
                activity.getAssignedTo().getId(),
                labelIds,
                parentIds,
                activity.getCreatedAt()
        );
    }
}
