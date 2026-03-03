-- Seed users (run after Keycloak realm is imported)
-- AI agents use API keys, humans use Keycloak auth

-- Human users (keycloak_id will be set after first login)
INSERT INTO team_hub.users (display_name, email, user_type, role, created_by)
VALUES
    ('Levent', 'levent@cds-platform.dev', 'HUMAN', 'ADMIN', 'system'),
    ('Junior', 'junior@cds-platform.dev', 'HUMAN', 'JUNIOR', 'system')
ON CONFLICT (email) DO NOTHING;

-- AI agents — API keys are passed as env vars: MIMAR_API_KEY, MUHENDIS_API_KEY
-- Generate keys via: POST /team-hub/api/v1/users/:id/api-key (requires ADMIN)
-- Or run this with psql -v to inject keys:
--   psql -v mimar_key="'your_key'" -v muhendis_key="'your_key'" -f seed-users.sql
INSERT INTO team_hub.users (display_name, user_type, role, api_key_hash, created_by)
VALUES
    ('Mimar', 'AI_AGENT', 'ARCHITECT',
     encode(sha256(coalesce(:'mimar_key', 'CHANGE_ME')::bytea), 'hex'), 'system'),
    ('Muhendis', 'AI_AGENT', 'ENGINEER',
     encode(sha256(coalesce(:'muhendis_key', 'CHANGE_ME')::bytea), 'hex'), 'system')
ON CONFLICT DO NOTHING;

-- Add all users to default channels
INSERT INTO team_hub.channel_members (channel_id, user_id, created_by)
SELECT c.id, u.id, 'system'
FROM team_hub.channels c
CROSS JOIN team_hub.users u
WHERE c.is_default = true
ON CONFLICT DO NOTHING;
