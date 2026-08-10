ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#64748B';

ALTER TABLE projects
    ADD CONSTRAINT chk_projects_color_hex
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
