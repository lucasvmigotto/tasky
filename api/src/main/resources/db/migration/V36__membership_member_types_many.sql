CREATE TABLE membership_member_types (
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    member_type_id UUID NOT NULL REFERENCES department_member_types(id) ON DELETE CASCADE,
    PRIMARY KEY (membership_id, member_type_id)
);

INSERT INTO membership_member_types (membership_id, member_type_id)
SELECT id, member_type_id FROM organization_memberships WHERE member_type_id IS NOT NULL;

ALTER TABLE organization_memberships DROP COLUMN member_type_id;

CREATE INDEX idx_membership_member_types_type
    ON membership_member_types(member_type_id);
