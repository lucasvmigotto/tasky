CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_clients_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_clients_organization_id ON clients(organization_id);

ALTER TABLE projects ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_client_id ON projects(client_id);

ALTER TABLE projects ADD COLUMN hourly_rate NUMERIC(10, 2);

CREATE TABLE time_entry_tags (
    time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (time_entry_id, tag)
);
CREATE INDEX idx_time_entry_tags_time_entry_id ON time_entry_tags(time_entry_id);
