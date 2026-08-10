-- Demand Work Hub: GLPI na demanda, multi-responsáveis, colunas por projeto, tarefas da demanda

-- GLPI ticket na demanda (mesmo padrão de time_entries.glpi_ticket_id)
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS glpi_ticket_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_internal_requests_glpi ON internal_requests(glpi_ticket_id);

-- Multi-responsáveis da demanda
CREATE TABLE IF NOT EXISTS request_assignees (
    request_id UUID NOT NULL REFERENCES internal_requests(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, membership_id)
);
CREATE INDEX IF NOT EXISTS idx_request_assignees_member ON request_assignees(membership_id);

-- Multi-responsáveis da tarefa (card)
CREATE TABLE IF NOT EXISTS activity_assignees (
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, membership_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_assignees_member ON activity_assignees(membership_id);

-- Colunas configuráveis por projeto (workflow)
CREATE TABLE IF NOT EXISTS project_columns (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    position INT NOT NULL,
    color VARCHAR(32),
    lifecycle_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_column_status CHECK (lifecycle_status IN ('TODO','IN_PROGRESS','IN_TESTING','BLOCKED','DONE','CANCELED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_columns_position ON project_columns(project_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_columns_status ON project_columns(project_id, lifecycle_status);

-- Tarefas vinculadas a uma demanda
ALTER TABLE activities ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES internal_requests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activities_request ON activities(request_id);

-- Colunas padrão para projetos existentes (Planejamento → Executando → Testes → Finalizado)
INSERT INTO project_columns (id, project_id, name, position, color, lifecycle_status)
SELECT gen_random_uuid(), p.id, c.name, c.position, c.color, c.lifecycle_status
FROM projects p
CROSS JOIN (
    VALUES
        ('Planejamento', 0, '#38bdf8', 'TODO'),
        ('Executando', 1, '#fbbf24', 'IN_PROGRESS'),
        ('Testes', 2, '#a78bfa', 'IN_TESTING'),
        ('Bloqueado', 3, '#f87171', 'BLOCKED'),
        ('Finalizado', 4, '#34d399', 'DONE'),
        ('Cancelado', 5, '#64748b', 'CANCELED')
) AS c(name, position, color, lifecycle_status)
WHERE NOT EXISTS (SELECT 1 FROM project_columns pc WHERE pc.project_id = p.id);
