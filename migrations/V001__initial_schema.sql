-- V001: Initial Team Hub schema
-- Creates all tables, indexes, triggers, and seed data

-- Schema
CREATE SCHEMA IF NOT EXISTS team_hub;

-- Enums
CREATE TYPE team_hub.user_type AS ENUM ('HUMAN', 'AI_AGENT');
CREATE TYPE team_hub.user_role AS ENUM ('ADMIN', 'ARCHITECT', 'ENGINEER', 'JUNIOR');
CREATE TYPE team_hub.decision_status AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE team_hub.vote_value AS ENUM ('APPROVE', 'REJECT', 'ABSTAIN');
CREATE TYPE team_hub.task_status AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
CREATE TYPE team_hub.task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE team_hub.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    keycloak_id VARCHAR(255) UNIQUE,
    api_key_hash VARCHAR(255),
    user_type team_hub.user_type NOT NULL,
    role team_hub.user_role NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_users_user_type ON team_hub.users(user_type);
CREATE INDEX idx_users_role ON team_hub.users(role);
CREATE INDEX idx_users_is_active ON team_hub.users(id) WHERE is_active = true;

-- ============================================================
-- 2. channels
-- ============================================================
CREATE TABLE team_hub.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_channels_is_archived ON team_hub.channels(id) WHERE is_archived = false;

-- ============================================================
-- 3. channel_members
-- ============================================================
CREATE TABLE team_hub.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES team_hub.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT unq_channel_members_channel_user UNIQUE (channel_id, user_id)
);

CREATE INDEX idx_channel_members_channel_id ON team_hub.channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON team_hub.channel_members(user_id);

-- ============================================================
-- 4. messages (soft delete)
-- ============================================================
CREATE TABLE team_hub.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES team_hub.channels(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES team_hub.messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,
    search_vector TSVECTOR,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_messages_channel_created ON team_hub.messages(channel_id, created_at);
CREATE INDEX idx_messages_author_id ON team_hub.messages(author_id);
CREATE INDEX idx_messages_parent_id ON team_hub.messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_messages_active ON team_hub.messages(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_search ON team_hub.messages USING GIN(search_vector);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION team_hub.messages_search_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_search_update
    BEFORE INSERT OR UPDATE OF content ON team_hub.messages
    FOR EACH ROW EXECUTE FUNCTION team_hub.messages_search_trigger();

-- ============================================================
-- 5. decisions
-- ============================================================
CREATE TABLE team_hub.decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    status team_hub.decision_status NOT NULL DEFAULT 'PROPOSED',
    channel_id UUID NOT NULL REFERENCES team_hub.channels(id) ON DELETE CASCADE,
    proposer_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_decisions_channel_id ON team_hub.decisions(channel_id);
CREATE INDEX idx_decisions_status ON team_hub.decisions(status);
CREATE INDEX idx_decisions_proposer_id ON team_hub.decisions(proposer_id);

-- ============================================================
-- 6. votes
-- ============================================================
CREATE TABLE team_hub.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES team_hub.decisions(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE SET NULL,
    value team_hub.vote_value NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT unq_votes_decision_voter UNIQUE (decision_id, voter_id)
);

CREATE INDEX idx_votes_decision_id ON team_hub.votes(decision_id);
CREATE INDEX idx_votes_voter_id ON team_hub.votes(voter_id);

-- ============================================================
-- 7. tasks
-- ============================================================
CREATE TABLE team_hub.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status team_hub.task_status NOT NULL DEFAULT 'BACKLOG',
    priority team_hub.task_priority NOT NULL DEFAULT 'MEDIUM',
    assignee_id UUID REFERENCES team_hub.users(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE SET NULL,
    due_date DATE,
    tags VARCHAR(100)[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_tasks_status ON team_hub.tasks(status);
CREATE INDEX idx_tasks_assignee_id ON team_hub.tasks(assignee_id);
CREATE INDEX idx_tasks_reporter_id ON team_hub.tasks(reporter_id);
CREATE INDEX idx_tasks_priority ON team_hub.tasks(priority);

-- ============================================================
-- 8. task_comments
-- ============================================================
CREATE TABLE team_hub.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES team_hub.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES team_hub.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_task_comments_task_id ON team_hub.task_comments(task_id);

-- ============================================================
-- 9. audit_log
-- ============================================================
CREATE TABLE team_hub.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(500)
);

CREATE INDEX idx_audit_log_entity ON team_hub.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_changed_at ON team_hub.audit_log(changed_at);
CREATE INDEX idx_audit_log_changed_by ON team_hub.audit_log(changed_by);

-- ============================================================
-- updated_at trigger (auto-update on all tables)
-- ============================================================
CREATE OR REPLACE FUNCTION team_hub.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['users', 'channels', 'channel_members', 'messages', 'decisions', 'votes', 'tasks', 'task_comments']
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_%s_updated_at
                BEFORE UPDATE ON team_hub.%I
                FOR EACH ROW EXECUTE FUNCTION team_hub.set_updated_at()
        ', tbl, tbl);
    END LOOP;
END;
$$;

-- ============================================================
-- Seed: Default channels
-- ============================================================
INSERT INTO team_hub.channels (name, description, is_default) VALUES
    ('general', 'General discussion', true),
    ('architecture', 'Architecture decisions and discussions', true),
    ('implementation', 'Implementation details and code discussions', true),
    ('questions', 'Questions and help requests', true),
    ('decisions', 'Decision proposals and voting', true);
