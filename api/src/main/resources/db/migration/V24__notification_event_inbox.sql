ALTER TABLE notifications
    ADD COLUMN event_key VARCHAR(255);

CREATE UNIQUE INDEX uq_notifications_recipient_event
    ON notifications (organization_id, recipient_membership_id, event_key)
    WHERE event_key IS NOT NULL;
