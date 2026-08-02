CREATE TABLE activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_by UUID NOT NULL REFERENCES organization_memberships(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_templates_org_name UNIQUE (organization_id, name)
);

CREATE INDEX idx_activity_templates_project
    ON activity_templates(organization_id, project_id);

CREATE TABLE activity_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    weight SMALLINT NOT NULL,
    duration_seconds BIGINT NOT NULL,
    estimated_seconds BIGINT NOT NULL DEFAULT 0,
    assigned_to UUID NOT NULL REFERENCES organization_memberships(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_template_version UNIQUE (template_id, version_number),
    CONSTRAINT chk_activity_template_weight CHECK (weight IN (1, 2, 3, 5, 8, 13)),
    CONSTRAINT chk_activity_template_duration CHECK (duration_seconds > 0),
    CONSTRAINT chk_activity_template_estimate CHECK (estimated_seconds >= 0)
);

CREATE INDEX idx_activity_template_versions_latest
    ON activity_template_versions(template_id, version_number DESC);

CREATE TABLE activity_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_version_id UUID NOT NULL REFERENCES activity_template_versions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    frequency VARCHAR(10) NOT NULL,
    recurrence_interval INTEGER NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    next_occurrence TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_recurrence_version UNIQUE (template_version_id),
    CONSTRAINT chk_activity_recurrence_frequency CHECK (frequency IN ('DAILY', 'WEEKLY')),
    CONSTRAINT chk_activity_recurrence_interval CHECK (recurrence_interval > 0)
);

CREATE INDEX idx_activity_recurrences_due
    ON activity_recurrences(next_occurrence)
    WHERE active = true;

CREATE TABLE activity_recurrence_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurrence_id UUID NOT NULL REFERENCES activity_recurrences(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_recurrence_occurrence UNIQUE (recurrence_id, scheduled_for),
    CONSTRAINT uq_activity_recurrence_activity UNIQUE (activity_id)
);
