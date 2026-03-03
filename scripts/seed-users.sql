-- Seed users (run after Keycloak realm is imported)
-- AI agents use API keys, humans use Keycloak auth

-- Human users (keycloak_id will be set after first login)
INSERT INTO team_hub.users (display_name, email, user_type, role, created_by)
VALUES
    ('Levent', 'levent@cds-platform.dev', 'HUMAN', 'ADMIN', 'system'),
    ('Junior', 'junior@cds-platform.dev', 'HUMAN', 'JUNIOR', 'system')
ON CONFLICT (email) DO NOTHING;

-- AI agents (api_key_hash generated from: thub_mimar_dev_key_2026 and thub_muhendis_dev_key_2026)
-- In production, generate proper keys via POST /users/:id/api-key
INSERT INTO team_hub.users (display_name, user_type, role, api_key_hash, created_by)
VALUES
    ('Mimar', 'AI_AGENT', 'ARCHITECT',
     encode(sha256('thub_mimar_dev_key_2026'::bytea), 'hex'), 'system'),
    ('Muhendis', 'AI_AGENT', 'ENGINEER',
     encode(sha256('thub_muhendis_dev_key_2026'::bytea), 'hex'), 'system')
ON CONFLICT DO NOTHING;

-- Add all users to default channels
INSERT INTO team_hub.channel_members (channel_id, user_id, created_by)
SELECT c.id, u.id, 'system'
FROM team_hub.channels c
CROSS JOIN team_hub.users u
WHERE c.is_default = true
ON CONFLICT DO NOTHING;
