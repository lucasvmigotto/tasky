-- PHASE 8 (T-MENTION): allow ACTIVITY_MENTION in the preferences CHECK.
ALTER TABLE notification_preferences
    DROP CONSTRAINT IF EXISTS chk_notification_preferences_type;

ALTER TABLE notification_preferences
    ADD CONSTRAINT chk_notification_preferences_type CHECK (type IN (
        'ACTIVITY_DUE_SOON',
        'ACTIVITY_OVERDUE',
        'ACTIVITY_MENTION',
        'OPEN_TIMER',
        'TIME_ENTRY_PENDING_APPROVAL'
    ));
