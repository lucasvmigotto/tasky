CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES organization_memberships(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_notification_preferences_membership_type UNIQUE (membership_id, type),
    CONSTRAINT chk_notification_preferences_type CHECK (type IN (
        'ACTIVITY_DUE_SOON',
        'ACTIVITY_OVERDUE',
        'OPEN_TIMER',
        'TIME_ENTRY_PENDING_APPROVAL'
    ))
);

CREATE INDEX idx_activities_open_due_reminders
    ON activities (due_date, assigned_to)
    WHERE due_date IS NOT NULL AND status NOT IN ('DONE', 'CANCELED');

CREATE INDEX idx_time_entries_open_timer_reminders
    ON time_entries (start_time, membership_id)
    WHERE end_time IS NULL;

CREATE INDEX idx_time_entries_pending_approval_reminders
    ON time_entries (submitted_at, organization_id)
    WHERE approval_status = 'SUBMITTED';
