CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    scope VARCHAR(32) NOT NULL,
    org_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    value_type VARCHAR(16) NOT NULL,
    value_text TEXT NULL,
    description TEXT,
    updated_by UUID NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_setting_scope CHECK (scope IN ('GLOBAL', 'ORGANIZATION')),
    CONSTRAINT chk_setting_value_type CHECK (value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'SECRET'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_setting_global_key ON app_settings(key) WHERE scope = 'GLOBAL';
CREATE UNIQUE INDEX IF NOT EXISTS uq_setting_org_key ON app_settings(scope, org_id, key) WHERE scope = 'ORGANIZATION';
CREATE INDEX IF NOT EXISTS idx_setting_org ON app_settings(org_id);
