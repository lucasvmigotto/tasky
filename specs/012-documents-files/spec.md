# 012 — Documents & files

> Status: Implemented (S3/MinIO path unproven outside compose).

## Stories

1. **Document library**: org document CRUD with visibility scoping.
   - Evidence [OBSERVED: `DocumentController.java:29-96`,
     `DocumentService`, `V15`].
2. **File uploads**: multipart upload with size/MIME policy by env,
   local disk default, S3/MinIO optional; downloads random prefix
   outside web root, extension validation, payload stripping.
   - Evidence [OBSERVED: `FileUploadService.uploadFile` (186L),
     `StorageConfig.java:37-79`, `DataSeeder` public/logo overrides].
3. **Profiles**: public (no-auth download) vs private (token stream).
   - Evidence [OBSERVED: `FileUploadController` profiles, 200MB public
     cap, 1000/day/IP].

## Planned

- Antivirus/ICAP scanning hook; S3 path verification runbook.
- Local-disk uploads are not covered by PostgreSQL backup/restore
  (carried forward from the former `docs/limitations.md`); measure RPO/RTO
  before relying on the backup runbook for blobs.
