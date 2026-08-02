ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS work_week_starts_on SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE organizations
    ADD CONSTRAINT chk_organizations_work_week_starts_on
    CHECK (work_week_starts_on BETWEEN 1 AND 7);

ALTER TABLE organization_memberships
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
