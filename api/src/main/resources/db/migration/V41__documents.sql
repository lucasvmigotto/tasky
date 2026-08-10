CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NULL REFERENCES projects(id) ON DELETE CASCADE,
    request_id UUID NULL REFERENCES internal_requests(id) ON DELETE CASCADE,
    activity_id UUID NULL REFERENCES activities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    content_md TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    author_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_activity ON documents(activity_id);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    content_md TEXT NOT NULL,
    changelog TEXT,
    created_by_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_document_version UNIQUE (document_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS document_attachments (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    stored_file_id UUID NULL REFERENCES stored_files(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_attachments_doc ON document_attachments(document_id);
