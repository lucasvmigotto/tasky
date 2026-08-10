CREATE TABLE request_sequences (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id),
    year INTEGER NOT NULL,
    last_value BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE internal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    request_key VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    requester_membership_id UUID NOT NULL REFERENCES organization_memberships(id),
    requesting_department_id UUID REFERENCES departments(id),
    responsible_department_id UUID REFERENCES departments(id),
    responsible_team_id UUID REFERENCES teams(id),
    assignee_membership_id UUID REFERENCES organization_memberships(id),
    desired_due_date TIMESTAMP WITH TIME ZONE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_internal_requests_org_key UNIQUE (organization_id, request_key),
    CONSTRAINT chk_internal_requests_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT chk_internal_requests_status CHECK (status IN ('NEW', 'TRIAGE', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELED'))
);

CREATE INDEX idx_internal_requests_org_status ON internal_requests(organization_id, status);
CREATE INDEX idx_internal_requests_responsible_dept ON internal_requests(organization_id, responsible_department_id);
CREATE INDEX idx_internal_requests_assignee ON internal_requests(organization_id, assignee_membership_id);
CREATE INDEX idx_internal_requests_requester ON internal_requests(organization_id, requester_membership_id);
