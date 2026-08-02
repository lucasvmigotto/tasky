package io.tasky.api.api.request;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.request.InternalRequest;
import io.tasky.api.domain.request.InternalRequestService;
import io.tasky.api.domain.request.RequestComment;
import io.tasky.api.domain.request.RequestPriority;
import io.tasky.api.domain.request.RequestStatus;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
@Transactional
public class InternalRequestController {

    private final InternalRequestService requestService;

    @PostMapping
    public ResponseEntity<InternalRequestResponse> create(
            @Valid @RequestBody CreateInternalRequestRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        InternalRequest created = requestService.create(
                orgId, user,
                request.title(), request.description(),
                parsePriority(request.priority()),
                request.requestingDepartmentId(),
                request.responsibleDepartmentId(),
                request.responsibleTeamId(),
                request.desiredDueDate());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping
    public ResponseEntity<PaginatedResponse<InternalRequestResponse>> list(
            @RequestParam("status") Optional<String> status,
            @RequestParam("priority") Optional<String> priority,
            @RequestParam("assigneeId") Optional<UUID> assigneeId,
            @RequestParam("responsibleDepartmentId") Optional<UUID> responsibleDepartmentId,
            @RequestParam(value = "mine", defaultValue = "false") boolean mine,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "100") int size,
            @AuthenticationPrincipal SecurityUser user) {

        UUID orgId = requiredOrgId(user);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 500),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<InternalRequest> result = requestService.search(
                orgId,
                status.map(s -> parseStatus(s, "status")).orElse(null),
                priority.map(p -> parsePriority(p)).orElse(null),
                assigneeId.orElse(null),
                mine,
                responsibleDepartmentId.orElse(null),
                user,
                pageable);

        List<InternalRequestResponse> content = result.getContent().stream().map(this::toResponse).toList();
        return ResponseEntity.ok(new PaginatedResponse<>(
                content, result.getTotalElements(), result.getTotalPages(),
                result.getSize(), result.getNumber()));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<InternalRequestResponse> get(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        return ResponseEntity.ok(toResponse(requestService.get(orgId, requestId)));
    }

    @PutMapping("/{requestId}")
    public ResponseEntity<InternalRequestResponse> update(
            @PathVariable UUID requestId,
            @Valid @RequestBody UpdateInternalRequestRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        InternalRequest updated = requestService.update(
                orgId, requestId,
                request.title(), request.description(),
                parsePriority(request.priority()),
                request.responsibleDepartmentId(),
                request.responsibleTeamId(),
                request.assigneeMembershipId(),
                request.desiredDueDate());
        return ResponseEntity.ok(toResponse(updated));
    }

    @PatchMapping("/{requestId}/status")
    public ResponseEntity<InternalRequestResponse> changeStatus(
            @PathVariable UUID requestId,
            @RequestBody ChangeRequestStatusRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        RequestStatus status = parseStatus(request.status(), "status");
        return ResponseEntity.ok(toResponse(requestService.changeStatus(orgId, requestId, status)));
    }

    @PatchMapping("/{requestId}/assign")
    public ResponseEntity<InternalRequestResponse> assign(
            @PathVariable UUID requestId,
            @RequestBody AssignRequestRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        InternalRequest updated = requestService.update(
                orgId, requestId, null, null, null, null, null,
                request.assigneeMembershipId(), null);
        return ResponseEntity.ok(toResponse(updated));
    }

    @PatchMapping("/{requestId}/link-project")
    public ResponseEntity<InternalRequestResponse> linkProject(
            @PathVariable UUID requestId,
            @RequestBody LinkRequestProjectRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        return ResponseEntity.ok(toResponse(requestService.linkProject(orgId, requestId, request.projectId())));
    }

    @PatchMapping("/{requestId}/link-activity")
    public ResponseEntity<InternalRequestResponse> linkActivity(
            @PathVariable UUID requestId,
            @RequestBody LinkRequestActivityRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        return ResponseEntity.ok(toResponse(requestService.linkActivity(orgId, requestId, request.activityId())));
    }

    @PostMapping("/{requestId}/convert-to-project")
    public ResponseEntity<InternalRequestResponse> convertToProject(
            @PathVariable UUID requestId,
            @Valid @RequestBody ConvertRequestToProjectRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        InternalRequest converted = requestService.convertToProject(
                orgId, requestId, request.name(), request.description());
        return ResponseEntity.ok(toResponse(converted));
    }

    @DeleteMapping("/{requestId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requestService.delete(orgId, requestId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{requestId}/comments")
    public ResponseEntity<List<RequestCommentResponse>> comments(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        List<RequestCommentResponse> comments = requestService.getComments(orgId, requestId).stream()
                .map(this::toCommentResponse)
                .toList();
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{requestId}/comments")
    public ResponseEntity<RequestCommentResponse> addComment(
            @PathVariable UUID requestId,
            @Valid @RequestBody CreateRequestCommentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        RequestComment comment = requestService.addComment(orgId, requestId, user, request.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(toCommentResponse(comment));
    }

    @DeleteMapping("/{requestId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID requestId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requestService.deleteComment(orgId, requestId, commentId, user);
        return ResponseEntity.noContent().build();
    }

    private RequestStatus parseStatus(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        try {
            return RequestStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid " + field + ": " + value);
        }
    }

    private RequestPriority parsePriority(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return RequestPriority.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid priority: " + value);
        }
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private InternalRequestResponse toResponse(InternalRequest request) {
        return new InternalRequestResponse(
                request.getId(),
                request.getOrganization().getId(),
                request.getRequestKey(),
                request.getTitle(),
                request.getDescription(),
                request.getPriority() != null ? request.getPriority().name() : null,
                request.getStatus() != null ? request.getStatus().name() : null,
                request.getRequester() != null ? request.getRequester().getId() : null,
                request.getRequestingDepartment() != null ? request.getRequestingDepartment().getId() : null,
                request.getResponsibleDepartment() != null ? request.getResponsibleDepartment().getId() : null,
                request.getResponsibleTeam() != null ? request.getResponsibleTeam().getId() : null,
                request.getAssignee() != null ? request.getAssignee().getId() : null,
                request.getDesiredDueDate(),
                request.getProject() != null ? request.getProject().getId() : null,
                request.getActivity() != null ? request.getActivity().getId() : null,
                request.getCompletedAt(),
                request.getCanceledAt(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }

    private RequestCommentResponse toCommentResponse(RequestComment comment) {
        return new RequestCommentResponse(
                comment.getId(),
                comment.getRequest().getId(),
                comment.getAuthor() != null ? comment.getAuthor().getId() : null,
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
