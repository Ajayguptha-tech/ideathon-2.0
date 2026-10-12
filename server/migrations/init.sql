-- ==============================================================================
-- IDEATHON 2.0 — SUPABASE POSTGRESQL PRODUCTION DATABASE SCHEMA
-- ==============================================================================
-- Schema for Young Innovators Club Ideathon 2.0 Team Registrations & Organizer Auth
-- Tables:
--   1. teams: Master team records with registration status & email delivery
--   2. team_members: Child table for exactly 2, 3, or 4 members per team
--   3. organizer_otps: Secure OTP storage for organizer email verification
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TEAMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id VARCHAR(32) NOT NULL UNIQUE,
    team_name VARCHAR(100) NOT NULL UNIQUE,
    team_size INT NOT NULL CHECK (team_size >= 2 AND team_size <= 4),
    status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_error TEXT,
    lead_confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
    lead_confirmation_error TEXT,
    organizer_notified BOOLEAN NOT NULL DEFAULT FALSE,
    organizer_notification_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for chronological sorting and fast search
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_registration_id ON teams (registration_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON teams (LOWER(team_name));

-- ------------------------------------------------------------------------------
-- 2. TEAM MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('LEAD', 'MEMBER')),
    member_index INT NOT NULL CHECK (member_index >= 1 AND member_index <= 4),
    name VARCHAR(100) NOT NULL,
    reg_no VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(20) NOT NULL CHECK (department IN ('CSE', 'ACSE', 'IT')),
    academic_year VARCHAR(20) NOT NULL CHECK (academic_year IN ('2nd', '3rd')),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_reg_no ON team_members (LOWER(reg_no));
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_team_members_department ON team_members (department);
CREATE INDEX IF NOT EXISTS idx_team_members_academic_year ON team_members (academic_year);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZER OTPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizer_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizer_otps_lookup ON organizer_otps (email, consumed, expires_at);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
-- Enable RLS and configure policies when supported roles exist (e.g., Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
        ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organizer_otps ENABLE ROW LEVEL SECURITY;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on teams') THEN
            CREATE POLICY "Service role full access on teams" ON teams
                FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on team_members') THEN
            CREATE POLICY "Service role full access on team_members" ON team_members
                FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on organizer_otps') THEN
            CREATE POLICY "Service role full access on organizer_otps" ON organizer_otps
                FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon access to teams') THEN
            CREATE POLICY "Deny anon access to teams" ON teams
                FOR SELECT TO anon USING (false);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Deny anon access to team_members') THEN
            CREATE POLICY "Deny anon access to team_members" ON team_members
                FOR SELECT TO anon USING (false);
        END IF;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. AUTO-UPDATE TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_teams_timestamp ON teams;
CREATE TRIGGER trigger_update_teams_timestamp
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp_column();
