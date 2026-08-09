ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS glpi_ticket_id VARCHAR(64);
