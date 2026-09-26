# 012 — Data model

- `documents`: org FK, title/content, visibility enum
  (PRIVATE/DEPARTMENT/PUBLIC), author FK, version.
- Uploaded blobs: path-keyed storage, DB references via
  `activity_attachments` / document bodies; `document_shares` removed
  in V37 (drift note).
