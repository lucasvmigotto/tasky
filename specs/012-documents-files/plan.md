# 012 — Plan (as-is)

- Backend: `FileUploadService` (362L), `StorageConfig`, `UploadLimits`
  (`StorageProperties` subset), `FileDownloadController` (public +
  token streams), `AvatarStorageService`.
- Frontend: profile avatar upload, attachment upload via `uploadFile`,
  admin storage config keys.
- Data: `documents`; uploads are filesystem/S3 objects with DB rows
  only for attachments/documents.
