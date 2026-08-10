package io.tasky.api.domain.document;

import io.tasky.api.config.ConfigRegistry;
import io.tasky.api.config.ConfigService;
import io.tasky.api.domain.activity.ActivityRepository;
import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.membership.OrganizationMembershipRepository;
import io.tasky.api.domain.project.ProjectRepository;
import io.tasky.api.domain.request.InternalRequestRepository;
import io.tasky.api.domain.storage.StoredFile;
import io.tasky.api.domain.storage.StoredFileRepository;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentAttachmentRepository attachmentRepository;
    private final StoredFileRepository storedFileRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ProjectRepository projectRepository;
    private final InternalRequestRepository requestRepository;
    private final ActivityRepository activityRepository;
    private final PermissionService permissionService;
    private final ConfigService configService;
    private final MarkdownRenderer markdownRenderer;

    public List<Document> list(UUID orgId, UUID projectId, UUID requestId, UUID activityId) {
        int scopes = (projectId != null ? 1 : 0) + (requestId != null ? 1 : 0) + (activityId != null ? 1 : 0);
        if (scopes != 1) {
            throw new IllegalArgumentException("Provide exactly one scope: projectId, requestId or activityId");
        }
        if (projectId != null) return documentRepository.findByOrganizationIdAndProjectIdOrderByUpdatedAtDesc(orgId, projectId);
        if (requestId != null) return documentRepository.findByOrganizationIdAndRequestIdOrderByUpdatedAtDesc(orgId, requestId);
        return documentRepository.findByOrganizationIdAndActivityIdOrderByUpdatedAtDesc(orgId, activityId);
    }

    public Document get(UUID orgId, UUID documentId) {
        return documentRepository.findByIdAndOrganizationId(documentId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
    }

    public Document create(UUID orgId, SecurityUser user, UUID projectId, UUID requestId, UUID activityId,
                           String title, String contentMd) {
        OrganizationMembership author = membership(user, orgId);
        validateScope(orgId, projectId, requestId, activityId);
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Document title is required");
        }
        Document document = Document.builder()
                .organization(author.getOrganization())
                .project(resolveProject(orgId, projectId))
                .request(resolveRequest(orgId, requestId))
                .activity(resolveActivity(orgId, activityId))
                .title(title.trim())
                .slug(slug(title.trim()))
                .contentMd(contentMd != null ? contentMd : "")
                .status("DRAFT")
                .author(author)
                .build();
        return documentRepository.save(document);
    }

    public Document update(UUID orgId, UUID documentId, SecurityUser user, String title, String contentMd, String changelog) {
        Document document = get(orgId, documentId);
        requireWrite(document, user, orgId);
        if (contentMd != null && !contentMd.equals(document.getContentMd())) {
            int nextVersion = versionRepository.findFirstByDocumentIdOrderByVersionNoDesc(documentId)
                    .map(v -> v.getVersionNo() + 1)
                    .orElse(1);
            versionRepository.save(DocumentVersion.builder()
                    .document(document)
                    .versionNo(nextVersion)
                    .contentMd(document.getContentMd())
                    .changelog(changelog)
                    .createdBy(membership(user, orgId))
                    .build());
            document.setContentMd(contentMd);
        }
        if (title != null && !title.isBlank() && !title.equals(document.getTitle())) {
            document.setTitle(title.trim());
            document.setSlug(slug(title.trim()));
        }
        return documentRepository.save(document);
    }

    public Document restore(UUID orgId, UUID documentId, UUID versionId, SecurityUser user) {
        Document document = get(orgId, documentId);
        requireWrite(document, user, orgId);
        DocumentVersion version = versionRepository.findById(versionId)
                .filter(v -> v.getDocument().getId().equals(documentId))
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));
        document.setContentMd(version.getContentMd());
        return documentRepository.save(document);
    }

    public void delete(UUID orgId, UUID documentId, SecurityUser user) {
        Document document = get(orgId, documentId);
        requireWrite(document, user, orgId);
        documentRepository.delete(document);
    }

    public List<DocumentVersion> versions(UUID orgId, UUID documentId) {
        get(orgId, documentId);
        return versionRepository.findByDocumentIdOrderByVersionNoDesc(documentId);
    }

    public DocumentAttachment addAttachment(UUID orgId, UUID documentId, UUID storedFileId, OrganizationMembership uploader) {
        Document document = get(orgId, documentId);
        StoredFile stored = storedFileRepository.findByIdAndOrganizationIdAndDeletedFalse(storedFileId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        return attachmentRepository.save(DocumentAttachment.builder()
                .document(document)
                .storedFileId(stored.getId())
                .fileName(stored.getFileName())
                .contentType(stored.getContentType())
                .sizeBytes(stored.getSizeBytes())
                .uploadedBy(uploader)
                .build());
    }

    public void removeAttachment(UUID orgId, UUID documentId, UUID attachmentId) {
        get(orgId, documentId);
        attachmentRepository.findByIdAndDocumentId(attachmentId, documentId)
                .ifPresent(attachmentRepository::delete);
    }

    public List<DocumentAttachment> attachments(UUID orgId, UUID documentId) {
        get(orgId, documentId);
        return attachmentRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
    }

    public String exportHtml(UUID orgId, UUID documentId) {
        Document document = get(orgId, documentId);
        return markdownRenderer.render(document.getTitle(), document.getContentMd());
    }

    private void validateScope(UUID orgId, UUID projectId, UUID requestId, UUID activityId) {
        int scopes = (projectId != null ? 1 : 0) + (requestId != null ? 1 : 0) + (activityId != null ? 1 : 0);
        if (scopes != 1) {
            throw new IllegalArgumentException("Provide exactly one scope: projectId, requestId or activityId");
        }
        if (projectId != null) resolveProject(orgId, projectId);
        if (requestId != null) resolveRequest(orgId, requestId);
        if (activityId != null) resolveActivity(orgId, activityId);
    }

    private io.tasky.api.domain.project.Project resolveProject(UUID orgId, UUID projectId) {
        if (projectId == null) return null;
        return projectRepository.findByIdAndDepartment_Organization_Id(projectId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }

    private io.tasky.api.domain.request.InternalRequest resolveRequest(UUID orgId, UUID requestId) {
        if (requestId == null) return null;
        return requestRepository.findById(requestId)
                .filter(r -> r.getOrganization().getId().equals(orgId))
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));
    }

    private io.tasky.api.domain.activity.Activity resolveActivity(UUID orgId, UUID activityId) {
        if (activityId == null) return null;
        return activityRepository.findByIdAndProject_Department_Organization_Id(activityId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
    }

    private void requireWrite(Document document, SecurityUser user, UUID orgId) {
        OrganizationMembership membership = membership(user, orgId);
        boolean authorAllowed = configService.getBoolean(orgId, ConfigRegistry.KEY_DOCS_EDIT_BY_AUTHOR);
        if (document.getAuthor().getId().equals(membership.getId()) && authorAllowed) {
            return;
        }
        if (permissionService.canManageOrganization(user, orgId)) {
            return;
        }
        throw new SecurityException("You cannot edit this document");
    }

    private OrganizationMembership membership(SecurityUser user, UUID orgId) {
        return membershipRepository.findByUserIdAndOrganizationIdAndIsActiveTrue(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
    }

    private String slug(String title) {
        String base = title.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.length() > 130) base = base.substring(0, 130);
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
