ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS estimated_seconds BIGINT NOT NULL DEFAULT 0;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS estimated_seconds BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS budget_seconds BIGINT,
    ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2);

ALTER TABLE organization_memberships
    ADD COLUMN IF NOT EXISTS cost_rate NUMERIC(10,2);

ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES organization_memberships(id),
    ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
    ADD COLUMN IF NOT EXISTS billing_rate_snapshot NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS cost_rate_snapshot NUMERIC(10,2);

ALTER TABLE time_entries
    ADD CONSTRAINT chk_time_entries_approval_status
    CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED'));

CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status
ON time_entries(organization_id, approval_status);
