package io.tasky.api.domain.storage;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.core.util.BinaryData;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tasky.api.config.ConfigRegistry;
import io.tasky.api.config.ConfigService;
import io.tasky.api.domain.membership.OrganizationMembership;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.Locale;

/**
 * Stores uploads in Azure Blob Storage when the super admin configures
 * {@code storage.azureConnectionString}; otherwise falls back to a local
 * directory (TASKY_UPLOAD_DIR, default {@code ./data/uploads}) so the feature
 * keeps working in development. Metadata always lives in {@code stored_files}.
 */
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final StoredFileRepository repository;
    private final ConfigService configService;
    private final Environment environment;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record StoredFileContent(String fileName, String contentType, long sizeBytes, byte[] bytes) {}

    public boolean isAzureConfigured() {
        String connection = configService.getSecret(ConfigRegistry.KEY_STORAGE_AZURE_CONNECTION);
        return connection != null && !connection.isBlank();
    }

    @Transactional
    public StoredFile upload(UUID orgId, OrganizationMembership uploader, String fileName, String contentType, byte[] bytes) {
        if (uploader == null || !uploader.getOrganization().getId().equals(orgId)) {
            throw new SecurityException("Not a member of this organization");
        }
        long maxBytes = configService.getLong(ConfigRegistry.KEY_STORAGE_MAX_UPLOAD_BYTES);
        if (bytes.length > maxBytes) {
            throw new IllegalArgumentException("File exceeds the maximum size of " + maxBytes + " bytes");
        }
        List<String> allowed = allowedMimeTypes();
        if (contentType == null || !allowed.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("File type " + contentType + " is not allowed");
        }
        String safeName = sanitizeName(fileName);
        String blobPath = orgId + "/" + UUID.randomUUID() + "/" + safeName;
        persist(blobPath, bytes);
        return repository.save(StoredFile.builder()
                .organization(uploader.getOrganization())
                .uploadedBy(uploader)
                .fileName(safeName)
                .contentType(contentType.toLowerCase(Locale.ROOT))
                .sizeBytes(bytes.length)
                .blobPath(blobPath)
                .deleted(false)
                .build());
    }

    @Transactional(readOnly = true)
    public StoredFileContent download(UUID orgId, UUID fileId) {
        StoredFile file = repository.findByIdAndOrganizationIdAndDeletedFalse(fileId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        return new StoredFileContent(file.getFileName(), file.getContentType(), file.getSizeBytes(), read(file.getBlobPath()));
    }

    @Transactional
    public void delete(UUID orgId, UUID fileId) {
        StoredFile file = repository.findByIdAndOrganizationIdAndDeletedFalse(fileId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        file.setDeleted(true);
        repository.save(file);
    }

    private List<String> allowedMimeTypes() {
        String json = configService.getJson(ConfigRegistry.KEY_STORAGE_ALLOWED_MIME);
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private void persist(String blobPath, byte[] bytes) {
        if (isAzureConfigured()) {
            blobContainer().getBlobClient(blobPath).upload(BinaryData.fromBytes(bytes), true);
        } else {
            writeLocal(blobPath, bytes);
        }
    }

    private byte[] read(String blobPath) {
        if (isAzureConfigured()) {
            BlobClient blob = blobContainer().getBlobClient(blobPath);
            return blob.downloadContent().toBytes();
        }
        Path path = localRoot().resolve(blobPath);
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("File content is unavailable", e);
        }
    }

    private BlobContainerClient blobContainer() {
        String connection = configService.getSecret(ConfigRegistry.KEY_STORAGE_AZURE_CONNECTION);
        String container = configService.getString(ConfigRegistry.KEY_STORAGE_CONTAINER);
        return new BlobServiceClientBuilder()
                .connectionString(connection)
                .buildClient()
                .getBlobContainerClient(container);
    }

    private Path localRoot() {
        String dir = environment.getProperty("TASKY_UPLOAD_DIR", "./data/uploads");
        return Paths.get(dir);
    }

    private void writeLocal(String blobPath, byte[] bytes) {
        try {
            Path path = localRoot().resolve(blobPath);
            Files.createDirectories(path.getParent());
            Files.write(path, bytes);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to persist file", e);
        }
    }

    private String sanitizeName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("File name is required");
        }
        String base = Paths.get(fileName.trim()).getFileName().toString();
        String clean = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.length() > 120 ? clean.substring(clean.length() - 120) : clean;
    }
}
