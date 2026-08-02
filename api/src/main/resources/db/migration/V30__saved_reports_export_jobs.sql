CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_saved_reports_organization_id ON saved_reports(organization_id);
CREATE INDEX idx_saved_reports_owner_membership_id ON saved_reports(owner_membership_id);

CREATE TABLE report_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    format VARCHAR(10) NOT NULL DEFAULT 'csv',
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    download_url VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_report_export_jobs_status CHECK (status IN ('PROCESSING', 'READY', 'FAILED'))
);
CREATE INDEX idx_report_export_jobs_organization_id ON report_export_jobs(organization_id);
CREATE INDEX idx_report_export_jobs_owner_membership_id ON report_export_jobs(owner_membership_id);
CREATE INDEX idx_report_export_jobs_expires_at ON report_export_jobs(expires_at);
