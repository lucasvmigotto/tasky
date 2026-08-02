ALTER TABLE organization_memberships
    ADD COLUMN invitation_status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN invited_by_membership_id UUID REFERENCES organization_memberships(id) ON DELETE SET NULL;

UPDATE organization_memberships
SET invitation_status = CASE WHEN is_active THEN 'ACCEPTED' ELSE 'REVOKED' END,
    accepted_at = CASE WHEN is_active THEN created_at ELSE NULL END,
    revoked_at = CASE WHEN is_active THEN NULL ELSE updated_at END;

ALTER TABLE organization_memberships
    ADD CONSTRAINT chk_membership_invitation_status
        CHECK (invitation_status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'));

CREATE INDEX idx_membership_invitation_org_status
    ON organization_memberships (organization_id, invitation_status, expires_at);
CREATE INDEX idx_membership_invitation_pending_user
    ON organization_memberships (user_id, expires_at)
    WHERE invitation_status = 'PENDING';
