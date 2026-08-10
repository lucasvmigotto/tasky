package io.tasky.api.api.audit;

import io.tasky.api.api.common.PaginatedResponse;
import io.tasky.api.domain.audit.AuditEvent;
import io.tasky.api.domain.audit.AuditService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-events")
@RequiredArgsConstructor
public class AuditController {
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("@access.canViewOrganizationReports(authentication.principal, authentication.principal.activeOrganizationId)")
    public ResponseEntity<PaginatedResponse<AuditEventResponse>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size,
            @AuthenticationPrincipal SecurityUser user) {
        var result = auditService.list(user.activeOrganizationId(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200), Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(new PaginatedResponse<>(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getTotalElements(), result.getTotalPages(), result.getSize(), result.getNumber()));
    }

    private AuditEventResponse toResponse(AuditEvent event) {
        return new AuditEventResponse(event.getId(), event.getOrganizationId(), event.getActorUserId(),
                event.getActorMembershipId(), event.getResourceType(), event.getResourceId(), event.getAction(),
                event.getBeforeData(), event.getAfterData(), event.getRequestId(), event.getCreatedAt());
    }
}
