package io.tasky.api.api.file;

import io.tasky.api.domain.membership.OrganizationMembership;
import io.tasky.api.domain.storage.FileStorageService;
import io.tasky.api.domain.storage.StoredFile;
import io.tasky.api.security.PermissionService;
import io.tasky.api.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<StoredFileResponse> upload(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        OrganizationMembership membership = permissionService.getMembership(user.id(), orgId)
                .orElseThrow(() -> new SecurityException("Not a member of this organization"));
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        try {
            StoredFile stored = fileStorageService.upload(orgId, membership,
                    file.getOriginalFilename() != null ? file.getOriginalFilename() : "arquivo",
                    file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                    file.getBytes());
            return ResponseEntity.ok(new StoredFileResponse(
                    stored.getId(), stored.getFileName(), stored.getContentType(),
                    stored.getSizeBytes(), "/api/v1/files/" + stored.getId()));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<byte[]> download(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        FileStorageService.StoredFileContent content = fileStorageService.download(orgId, fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .contentLength(content.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(content.fileName(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(content.bytes());
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal SecurityUser user) {
        UUID orgId = requiredOrgId(user);
        fileStorageService.delete(orgId, fileId);
        return ResponseEntity.noContent().build();
    }

    private UUID requiredOrgId(SecurityUser user) {
        if (user == null || user.activeOrganizationId() == null) {
            throw new SecurityException("No active organization");
        }
        return user.activeOrganizationId();
    }
}
