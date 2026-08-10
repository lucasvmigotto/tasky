CREATE TABLE timesheet_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES organization_memberships(id),
    rejection_comment TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_timesheet_periods_range CHECK (period_end > period_start),
    CONSTRAINT chk_timesheet_periods_status
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED')),
    CONSTRAINT uq_timesheet_periods_membership_week
        UNIQUE (organization_id, membership_id, period_start, period_end)
);

CREATE INDEX idx_timesheet_periods_org_status
    ON timesheet_periods(organization_id, status);

CREATE INDEX idx_timesheet_periods_membership_id
    ON timesheet_periods(membership_id);
