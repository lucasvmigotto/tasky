ALTER TABLE activities
    ADD COLUMN task_type VARCHAR(20) NOT NULL DEFAULT 'TASK',
    ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE activities
    ADD CONSTRAINT chk_activities_task_type CHECK (task_type IN ('TASK', 'BUG', 'IMPROVEMENT', 'SUPPORT', 'MEETING', 'MILESTONE')),
    ADD CONSTRAINT chk_activities_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));

CREATE INDEX idx_activities_priority ON activities(priority);
CREATE INDEX idx_activities_due_date ON activities(due_date);

CREATE TABLE activity_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    completed_by UUID REFERENCES organization_memberships(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_checklist_items_activity ON activity_checklist_items(activity_id, position);
