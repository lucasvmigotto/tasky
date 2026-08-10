CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    actor_membership_id UUID NOT NULL REFERENCES organization_memberships(id),
    comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chk_activity_events_type CHECK (event_type IN (
        'COMMENT_CREATED',
        'COMMENT_DELETED',
        'ASSIGNEE_CHANGED',
        'STATUS_CHANGED',
        'DUE_DATE_CHANGED'
    ))
);

CREATE INDEX idx_activity_events_feed
    ON activity_events (organization_id, activity_id, created_at DESC, id DESC);

CREATE TABLE activity_comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
    mentioned_membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_activity_comment_mentions UNIQUE (comment_id, mentioned_membership_id)
);

CREATE INDEX idx_activity_comment_mentions_comment
    ON activity_comment_mentions (comment_id, created_at, id);
