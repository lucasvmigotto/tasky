package io.tasky.api.domain.request;

import io.tasky.api.api.common.ConflictException;
import io.tasky.api.domain.activity.Activity;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.domain.department.Department;
import io.tasky.api.domain.department.DepartmentRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.project.Project;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.project.ProjectService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class InternalRequestService {

    private final InternalRequestRepository requestRepository;
    private final RequestCommentRepository commentRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final ActivityRepository activityRepository;
    private final ProjectService projectService;
    private final AuditService auditService;

    public InternalRequest create(UUID orgId, SecurityUser user,
                                  String title, String description,
                                  RequestPriority priority,
                                  UUID requestingDepartmentId, UUID responsibleDepartmentId,
                                  Instant desiredDueDate) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        OrganizationMembership requester = membershipRepository.findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));

        Department requestingDept = resolveDepartment(orgId, requestingDepartmentId);
        Department responsibleDept = resolveDepartment(orgId, responsibleDepartmentId);

        int year = Year.now().getValue();
        long seq = requestRepository.nextSequence(orgId, year);
        String key = String.format("DEM-%d-%04d", year, seq);

        InternalRequest request = InternalRequest.builder()
                .organization(requester.getOrganization())
                .requestKey(key)
                .title(title.trim())
                .description(description)
                .priority(priority != null ? priority : RequestPriority.NORMAL)
                .status(RequestStatus.NEW)
                .requester(requester)
                .requestingDepartment(requestingDept)
                .responsibleDepartment(responsibleDept)
                .desiredDueDate(desiredDueDate)
                .build();
        request = requestRepository.save(request);
        auditService.record(orgId, user.id(), requester.getId(), "internal_request", request.getId(),
                "CREATE", null, "status=NEW,key=" + key, null);
        return request;
    }

    public Page<InternalRequest> search(UUID orgId, RequestStatus status, RequestPriority priority,
                                        UUID assigneeId, boolean mineOnly, UUID responsibleDepartmentId,
                                        SecurityUser user, Pageable pageable) {
        Specification<InternalRequest> spec = (root, query, cb) -> cb.equal(root.get("organization").get("id"), orgId);

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }
        if (assigneeId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignee").get("id"), assigneeId));
        }
        if (responsibleDepartmentId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("responsibleDepartment").get("id"), responsibleDepartmentId));
        }

        if (mineOnly) {
            OrganizationMembership membership = membershipRepository
                    .findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), orgId)
                    .orElseThrow(() -> new SecurityException("Not a member of this organization"));
            UUID membershipId = membership.getId();
            spec = spec.and((root, query, cb) -> cb.equal(root.get("assignee").get("id"), membershipId));
        }

        return requestRepository.findAll(spec, pageable);
    }

    public InternalRequest get(UUID orgId, UUID requestId) {
        return requestRepository.findById(requestId)
                .filter(r -> r.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
    }

    public InternalRequest update(UUID orgId, UUID requestId,
                                  String title, String description,
                                  RequestPriority priority,
                                  UUID responsibleDepartmentId,
                                  UUID assigneeMembershipId, Instant desiredDueDate) {
        InternalRequest request = get(orgId, requestId);
        requireEditableStatus(request);

        if (title != null && !title.isBlank()) {
            request.setTitle(title.trim());
        }
        if (description != null) {
            request.setDescription(description);
        }
        if (priority != null) {
            request.setPriority(priority);
        }
        if (responsibleDepartmentId != null) {
            request.setResponsibleDepartment(resolveDepartment(orgId, responsibleDepartmentId));
        }
        if (assigneeMembershipId != null) {
            request.setAssignee(membershipRepository.findById(assigneeMembershipId)
                    .filter(m -> m.getOrganization().getId().equals(orgId))
                    .orElseThrow(() -> new IllegalArgumentException("Assignee membership not found")));
        }
        request.setDesiredDueDate(desiredDueDate);
        return requestRepository.save(request);
    }

    public InternalRequest changeStatus(UUID orgId, UUID requestId, RequestStatus status) {
        InternalRequest request = get(orgId, requestId);
        if (status == request.getStatus()) {
            return request;
        }
        RequestStatus previous = request.getStatus();
        request.setStatus(status);
        if (status == RequestStatus.DONE) {
            request.setCompletedAt(Instant.now());
            request.setCanceledAt(null);
        } else if (status == RequestStatus.CANCELED) {
            request.setCanceledAt(Instant.now());
            request.setCompletedAt(null);
        } else {
            request.setCompletedAt(null);
            request.setCanceledAt(null);
        }
        InternalRequest saved = requestRepository.save(request);
        auditService.record(orgId, actorUserId(request), request.getRequester().getId(),
                "internal_request", requestId, "STATUS_CHANGE",
                "status=" + previous, "status=" + status, null);
        return saved;
    }

    public InternalRequest linkProject(UUID orgId, UUID requestId, UUID projectId) {
        InternalRequest request = get(orgId, requestId);
        Project project = projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        request.setProject(project);
        if (request.getStatus() == RequestStatus.NEW || request.getStatus() == RequestStatus.TRIAGE) {
            request.setStatus(RequestStatus.PLANNED);
        }
        InternalRequest saved = requestRepository.save(request);
        auditService.record(orgId, actorUserId(request), request.getRequester().getId(),
                "internal_request", requestId, "LINK_PROJECT",
                null, "projectId=" + projectId, null);
        return saved;
    }

    public InternalRequest linkActivity(UUID orgId, UUID requestId, UUID activityId) {
        InternalRequest request = get(orgId, requestId);
        Activity activity = activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        request.setActivity(activity);
        if (request.getProject() == null) {
            request.setProject(activity.getProject());
        }
        if (request.getStatus() == RequestStatus.NEW || request.getStatus() == RequestStatus.TRIAGE) {
            request.setStatus(RequestStatus.PLANNED);
        }
        InternalRequest saved = requestRepository.save(request);
        auditService.record(orgId, actorUserId(request), request.getRequester().getId(),
                "internal_request", requestId, "LINK_ACTIVITY",
                null, "activityId=" + activityId, null);
        return saved;
    }

    public InternalRequest convertToProject(UUID orgId, UUID requestId, String name, String description) {
        InternalRequest request = get(orgId, requestId);
        if (request.getProject() != null) {
            throw new ConflictException("Request already linked to a project");
        }
        if (request.getResponsibleDepartment() == null) {
            throw new IllegalArgumentException("A responsible department is required to convert to a project");
        }
        UUID deptId = request.getResponsibleDepartment().getId();
        Project project = projectService.createProject(
                deptId,
                name != null && !name.isBlank() ? name.trim() : request.getTitle().trim(),
                description != null ? description : request.getDescription(),
                null,
                null,
                null, null, null, null);
        request.setProject(project);
        RequestStatus previous = request.getStatus();
        request.setStatus(RequestStatus.PLANNED);
        InternalRequest saved = requestRepository.save(request);
        auditService.record(orgId, actorUserId(request), request.getRequester().getId(),
                "internal_request", requestId, "CONVERT_TO_PROJECT",
                "status=" + previous, "status=PLANNED,projectId=" + project.getId(), null);
        return saved;
    }

    public void delete(UUID orgId, UUID requestId) {
        InternalRequest request = get(orgId, requestId);
        requireEditableStatus(request);
        requestRepository.delete(request);
    }

    public List<RequestComment> getComments(UUID orgId, UUID requestId) {
        get(orgId, requestId);
        return commentRepository.findByRequestIdOrderByCreatedAtAsc(requestId).stream()
                .filter(c -> !c.isDeleted())
                .toList();
    }

    public RequestComment addComment(UUID orgId, UUID requestId, SecurityUser user, String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Comment content is required");
        }
        InternalRequest request = get(orgId, requestId);
        OrganizationMembership author = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        RequestComment comment = RequestComment.builder()
                .request(request)
                .author(author)
                .content(content.trim())
                .deleted(false)
                .build();
        return commentRepository.save(comment);
    }

    public void deleteComment(UUID orgId, UUID requestId, UUID commentId, SecurityUser user) {
        get(orgId, requestId);
        RequestComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        if (!comment.getRequest().getId().equals(requestId)) {
            throw new SecurityException("Comment does not belong to this request");
        }
        OrganizationMembership actor = membershipRepository
                .findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        if (!comment.getAuthor().getId().equals(actor.getId())) {
            throw new SecurityException("You can only delete your own comments");
        }
        comment.setDeleted(true);
        comment.setContent("[comentario removido]");
        commentRepository.save(comment);
    }

    private UUID actorUserId(InternalRequest request) {
        return request.getRequester() != null && request.getRequester().getUser() != null
                ? request.getRequester().getUser().getId()
                : null;
    }

    private void requireEditableStatus(InternalRequest request) {
        if (request.getStatus() == RequestStatus.DONE || request.getStatus() == RequestStatus.CANCELED) {
            throw new ConflictException("Completed or canceled requests cannot be edited");
        }
    }

    private Department resolveDepartment(UUID orgId, UUID departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .filter(d -> d.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
    }
}
