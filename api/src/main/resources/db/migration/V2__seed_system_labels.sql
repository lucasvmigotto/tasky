CREATE OR REPLACE FUNCTION seed_system_labels(org_id UUID) RETURNS void AS $$
BEGIN
    INSERT INTO labels (organization_id, slug, display_name, is_system)
    VALUES
        (org_id, 'urgent',  'Urgent',  true),
        (org_id, 'idea',    'Idea',    true),
        (org_id, 'feature', 'Feature', true),
        (org_id, 'fix',     'Fix',     true),
        (org_id, 'routine', 'Routine', true)
    ON CONFLICT (organization_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
