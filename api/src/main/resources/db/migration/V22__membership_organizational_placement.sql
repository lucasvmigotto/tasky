ALTER TABLE organization_memberships
    ADD COLUMN primary_department_id UUID,
    ADD COLUMN primary_team_id UUID;

ALTER TABLE organization_memberships
    ADD CONSTRAINT fk_memberships_primary_department
        FOREIGN KEY (primary_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_memberships_primary_team
        FOREIGN KEY (primary_team_id) REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX idx_memberships_primary_department_id
    ON organization_memberships(primary_department_id)
    WHERE primary_department_id IS NOT NULL;

CREATE INDEX idx_memberships_primary_team_id
    ON organization_memberships(primary_team_id)
    WHERE primary_team_id IS NOT NULL;

UPDATE organization_memberships membership
SET primary_department_id = scope.department_id
FROM (
    SELECT membership_id, min(department_id::text)::uuid AS department_id
    FROM manager_departments
    GROUP BY membership_id
) scope
WHERE membership.id = scope.membership_id
  AND membership.primary_department_id IS NULL;

UPDATE organization_memberships membership
SET primary_department_id = placement.department_id,
    primary_team_id = placement.team_id
FROM (
    SELECT DISTINCT ON (leader.membership_id)
           leader.membership_id,
           team.department_id,
           leader.team_id
    FROM leader_teams leader
    JOIN teams team ON team.id = leader.team_id
    ORDER BY leader.membership_id, leader.team_id
) placement
WHERE membership.id = placement.membership_id
  AND membership.primary_department_id IS NULL;
