package io.tasky.api.api.document;

import io.tasky.api.domain.document.Document;
import io.tasky.api.domain.document.DocumentAttachment;
import io.tasky.api.domain.document.DocumentService;
import io.tasky.api.domain.document.DocumentVersion;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> list(
            @RequestParam(value = "projectId", required = false) UUID projectId,
            @RequestParam(value = "requestId", required = false) UUID requestId,
            @RequestParam(value = "activityId", required = false) UUID activityId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(documentService.list(orgId, projectId, requestId, activityId).stream()
                .map(this::toResponse).toList());
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> create(
            @Valid @RequestBody CreateDocumentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        Document document = documentService.create(orgId, user, request.projectId(), request.requestId(),
                request.activityId(), request.title(), request.contentMd());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(document));
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> get(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(toResponse(documentService.get(orgId, documentId)));
    }

    @PutMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> update(
            @PathVariable UUID documentId,
            @Valid @RequestBody UpdateDocumentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        Document document = documentService.update(orgId, documentId, user,
                request.title(), request.contentMd(), request.changelog());
        return ResponseEntity.ok(toResponse(document));
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        documentService.delete(orgId, documentId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/versions")
    public ResponseEntity<List<DocumentVersionResponse>> versions(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(documentService.versions(orgId, documentId).stream()
                .map(this::toVersionResponse).toList());
    }

    @PostMapping("/{documentId}/restore/{versionId}")
    public ResponseEntity<DocumentResponse> restore(
            @PathVariable UUID documentId,
            @PathVariable UUID versionId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(toResponse(documentService.restore(orgId, documentId, versionId, user)));
    }

    @GetMapping("/{documentId}/attachments")
    public ResponseEntity<List<DocumentAttachmentResponse>> attachments(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        return ResponseEntity.ok(documentService.attachments(orgId, documentId).stream()
                .map(this::toAttachmentResponse).toList());
    }

    @PostMapping("/{documentId}/attachments")
    public ResponseEntity<DocumentAttachmentResponse> addAttachment(
            @PathVariable UUID documentId,
            @Valid @RequestBody AddDocumentAttachmentRequest request,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        OrganizationMembership membership = requireMember(user, orgId);
        DocumentAttachment attachment = documentService.addAttachment(orgId, documentId, request.storedFileId(), membership);
        return ResponseEntity.status(HttpStatus.CREATED).body(toAttachmentResponse(attachment));
    }

    @DeleteMapping("/{documentId}/attachments/{attachmentId}")
    public ResponseEntity<Void> removeAttachment(
            @PathVariable UUID documentId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        documentService.removeAttachment(orgId, documentId, attachmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/{documentId}/export", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<byte[]> export(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        requireMember(user, orgId);
        String html = documentService.exportHtml(orgId, documentId);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html.getBytes(StandardCharsets.UTF_8));
    }

    private OrganizationMembership requireMember(SecurityUser user, UUID orgId) {
        return permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user == null || user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }

    private DocumentResponse toResponse(Document document) {
        int version = documentService.versions(document.getOrganization().getId(), document.getId()).size();
        int attachments = documentService.attachments(document.getOrganization().getId(), document.getId()).size();
        return new DocumentResponse(
                document.getId(),
                document.getOrganization().getId(),
                document.getProject() != null ? document.getProject().getId() : null,
                document.getRequest() != null ? document.getRequest().getId() : null,
                document.getActivity() != null ? document.getActivity().getId() : null,
                document.getTitle(),
                document.getSlug(),
                document.getContentMd(),
                document.getStatus(),
                document.getAuthor().getId(),
                displayName(document.getAuthor()),
                version,
                attachments,
                document.getCreatedAt(),
                document.getUpdatedAt());
    }

    private DocumentVersionResponse toVersionResponse(DocumentVersion version) {
        return new DocumentVersionResponse(version.getId(), version.getVersionNo(), version.getContentMd(),
                version.getChangelog(), version.getCreatedBy().getId(), version.getCreatedAt());
    }

    private DocumentAttachmentResponse toAttachmentResponse(DocumentAttachment attachment) {
        return new DocumentAttachmentResponse(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getStoredFileId() != null ? "/api/v1/files/" + attachment.getStoredFileId() : null,
                attachment.getUploadedBy().getId(),
                attachment.getCreatedAt());
    }

    private String displayName(OrganizationMembership membership) {
        if (membership.getCustomUsername() != null && !membership.getCustomUsername().isBlank()) return membership.getCustomUsername();
        if (membership.getUser().getDisplayName() != null && !membership.getUser().getDisplayName().isBlank()) return membership.getUser().getDisplayName();
        return membership.getUser().getUsername();
    }
}
