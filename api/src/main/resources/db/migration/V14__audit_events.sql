CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    action VARCHAR(80) NOT NULL,
    before_data TEXT,
    after_data TEXT,
    request_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_org_created
ON audit_events(organization_id, created_at DESC);

CREATE INDEX idx_audit_events_resource
ON audit_events(resource_type, resource_id);
