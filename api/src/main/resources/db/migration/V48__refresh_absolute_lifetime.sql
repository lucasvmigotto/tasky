-- Workstream B: absolute refresh-family lifetime (30 days) + concurrency lock support.
ALTER TABLE refresh_sessions
    ADD COLUMN IF NOT EXISTS family_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Backfill: absolute expiry = oldest family creation + 30 days.
UPDATE refresh_sessions s
SET family_expires_at = sub.min_created + INTERVAL '30 days'
FROM (
    SELECT family_id, MIN(created_at) AS min_created
    FROM refresh_sessions
    GROUP BY family_id
) sub
WHERE s.family_id = sub.family_id
  AND s.family_expires_at IS NULL;

ALTER TABLE refresh_sessions
    ALTER COLUMN family_expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family_expires
ON refresh_sessions (family_expires_at);
