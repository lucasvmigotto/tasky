-- Remove etiquetas (labels), unidades solicitantes (clients), equipes (teams) e o papel "leader".

-- 1) Drop FKs / columns referencing the removed tables.

ALTER TABLE projects DROP COLUMN IF EXISTS client_id;

ALTER TABLE organization_memberships
    DROP CONSTRAINT IF EXISTS fk_memberships_primary_team,
    DROP COLUMN IF EXISTS primary_team_id;

ALTER TABLE internal_requests
    DROP CONSTRAINT IF EXISTS internal_requests_responsible_team_id_fkey,
    DROP COLUMN IF EXISTS responsible_team_id;

-- 2) Reclassify any existing leader membership to employee (enum no longer supports "leader").

UPDATE organization_memberships
SET role = 'employee'
WHERE role = 'leader';

-- 3) Drop tables.

DROP TABLE IF EXISTS activity_labels;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS time_entry_tags;
DROP TABLE IF EXISTS leader_teams;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS clients;

-- 4) Update role CHECK constraint (drop "leader").

ALTER TABLE organization_memberships
    DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

ALTER TABLE organization_memberships
    ADD CONSTRAINT organization_memberships_role_check
        CHECK (role IN ('admin', 'manager', 'employee'));

-- 5) Drop the now-unused label seeding function.

DROP FUNCTION IF EXISTS seed_system_labels(UUID);
