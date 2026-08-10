CREATE UNIQUE INDEX uq_time_entries_one_running_per_membership
ON time_entries (membership_id)
WHERE end_time IS NULL;
