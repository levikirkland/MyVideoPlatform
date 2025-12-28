require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS memberships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) NOT NULL CHECK (status IN ('pending','active','expired','canceled')),
            provider VARCHAR(50) NOT NULL,
            provider_subscription_id VARCHAR(255) NOT NULL UNIQUE,
            amount_cents INTEGER NOT NULL DEFAULT 500,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`,
        `ALTER TABLE memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`,
        `ALTER TABLE videos ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;`,
        `ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;`,
        `ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE;`,
        `ALTER TABLE videos ADD COLUMN IF NOT EXISTS access_mode VARCHAR(20) NOT NULL DEFAULT 'public';`,
        `DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_access_mode') THEN
                BEGIN
                    ALTER TYPE video_access_mode ADD VALUE 'paidfans';
                EXCEPTION WHEN duplicate_object THEN NULL;
                END;
                BEGIN
                    ALTER TYPE video_access_mode ADD VALUE 'username_only';
                EXCEPTION WHEN duplicate_object THEN NULL;
                END;
            END IF;
        END;
        $$;`,
        `DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'videos_access_mode_check'
            ) THEN
                ALTER TABLE videos ADD CONSTRAINT videos_access_mode_check CHECK (access_mode IN ('public','paidfans','username_only'));
            END IF;
        END;
        $$;`,
        `ALTER TABLE videos ADD COLUMN IF NOT EXISTS single_username VARCHAR(255);`,
        `CREATE TABLE IF NOT EXISTS video_access (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
            username VARCHAR(100) NOT NULL,
            granted_by_creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
            granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (video_id, username)
        );`,
        `CREATE TABLE IF NOT EXISTS creator_payment_links (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(50) NOT NULL,
            label VARCHAR(100) NOT NULL,
            url VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );`
    ];

    try {
        for (const query of queries) {
            await pool.query(query);
        }
        console.log('Membership schema updated.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to update membership schema:', error);
        process.exit(1);
    }
}

run();
