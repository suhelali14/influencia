-- ============================================================
-- Migration 006: Creator Index with pgvector + Job Tracking
-- ============================================================
-- Run ONCE on your Neon database to set up the new architecture.
-- This is NON-DESTRUCTIVE: keeps discovered_creators table intact.
--
-- Usage: psql $DATABASE_URL -f 006_creator_index_pgvector.sql
-- ============================================================

-- Step 1: Enable pgvector extension (FREE on Neon, all tiers)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- CAMPAIGN EMBEDDINGS
-- Stores the 384-dim semantic vector for each campaign.
-- Used for incremental matrix updates:
--   new creator → similarity vs ALL campaign embeddings in ONE query
--   new campaign → similarity vs ALL creator embeddings in ONE query
-- This avoids full re-discovery on every campaign change.
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_embeddings (
  campaign_id   UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  embedding     vector(384) NOT NULL,   -- all-MiniLM-L6-v2 of title+description+category+niche
  embed_text    TEXT,                   -- the text that was embedded (for debugging/re-embedding)
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Index so we can do batch similarity: all campaigns vs one creator
CREATE INDEX IF NOT EXISTS idx_campaign_embeddings_embedding
  ON campaign_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================
-- GLOBAL CREATOR INDEX
-- One row per creator across ALL campaigns.
-- Deduplication key: (handle, platform)
-- Reused across campaigns via campaign_creator_scores join table.
-- ============================================================
CREATE TABLE IF NOT EXISTS creator_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle          VARCHAR(150) NOT NULL,
  platform        VARCHAR(30)  NOT NULL,
  name            VARCHAR(300),
  profile_url     TEXT,
  avatar_url      TEXT,
  followers_count BIGINT       DEFAULT 0,
  engagement_rate DECIMAL(6,2) DEFAULT 0,
  region          VARCHAR(150),
  categories      TEXT[]       DEFAULT '{}',
  bio_text        TEXT,                              -- concatenated text used to generate embedding
  embedding       vector(384),                       -- all-MiniLM-L6-v2 (FREE, local)
  source          VARCHAR(50)  DEFAULT 'unknown',    -- youtube_api | google_serp | twitter | reddit | seed_data
  data_freshness  TIMESTAMP    DEFAULT NOW(),        -- when this row was last fetched from the internet
  raw_data        JSONB,
  created_at      TIMESTAMP    DEFAULT NOW(),
  updated_at      TIMESTAMP    DEFAULT NOW(),

  -- Dedup: same creator can appear across platforms (e.g. @techguru on IG and YT = 2 rows)
  CONSTRAINT creator_index_platform_handle_unique UNIQUE (platform, handle)
);

-- IVFFlat index for fast cosine similarity search
-- lists=100 is ideal for 100K-1M vectors; adjust upward as data grows
CREATE INDEX IF NOT EXISTS idx_creator_index_embedding
  ON creator_index USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Supporting indexes
CREATE INDEX IF NOT EXISTS idx_creator_index_platform_region
  ON creator_index (platform, region);

CREATE INDEX IF NOT EXISTS idx_creator_index_followers
  ON creator_index (followers_count DESC);

CREATE INDEX IF NOT EXISTS idx_creator_index_freshness
  ON creator_index (data_freshness DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_creator_index_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_creator_index_updated_at ON creator_index;
CREATE TRIGGER trg_creator_index_updated_at
  BEFORE UPDATE ON creator_index
  FOR EACH ROW EXECUTE FUNCTION update_creator_index_updated_at();


-- ============================================================
-- CAMPAIGN ↔ CREATOR SCORES
-- Thin join table. One row per (campaign, creator) pair.
-- The actual creator data lives in creator_index (no duplication).
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_creator_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id      UUID         NOT NULL REFERENCES creator_index(id) ON DELETE CASCADE,
  match_score     DECIMAL(5,2) DEFAULT 0,    -- combined final score (0-100)
  semantic_score  DECIMAL(5,2) DEFAULT 0,    -- from pgvector cosine similarity
  heuristic_score DECIMAL(5,2) DEFAULT 0,    -- from rule-based scoring (followers, engagement, etc.)
  rank            INT          DEFAULT 0,
  ai_summary      TEXT,
  strengths       TEXT[]       DEFAULT '{}',
  concerns        TEXT[]       DEFAULT '{}',
  created_at      TIMESTAMP    DEFAULT NOW(),

  CONSTRAINT campaign_creator_unique UNIQUE (campaign_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_ccs_campaign_rank
  ON campaign_creator_scores (campaign_id, rank ASC);

CREATE INDEX IF NOT EXISTS idx_ccs_campaign_score
  ON campaign_creator_scores (campaign_id, match_score DESC);


-- ============================================================
-- DISCOVERY JOBS
-- Tracks background job status per campaign.
-- Frontend polls this to show progress + "Sync" button state.
-- ============================================================
CREATE TABLE IF NOT EXISTS discovery_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status          VARCHAR(20)  DEFAULT 'pending'
                               CHECK (status IN ('pending','running','done','failed','cancelled')),
  progress        INT          DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_found     INT          DEFAULT 0,
  sources_used    TEXT[]       DEFAULT '{}',
  error_msg       TEXT,
  triggered_by    VARCHAR(30)  DEFAULT 'system', -- 'system'|'user_sync'|'campaign_create'
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_jobs_campaign
  ON discovery_jobs (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovery_jobs_status
  ON discovery_jobs (status, created_at DESC);


-- ============================================================
-- RATE LIMITING TABLE
-- Prevent brands from abusing the discovery job feature.
-- ============================================================
CREATE TABLE IF NOT EXISTS discovery_rate_limits (
  brand_id        UUID         NOT NULL,
  job_date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  job_count       INT          DEFAULT 0,
  PRIMARY KEY (brand_id, job_date)
);


-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 006 complete.';
  RAISE NOTICE 'Tables created: creator_index, campaign_creator_scores, discovery_jobs, discovery_rate_limits';
  RAISE NOTICE 'pgvector extension: enabled';
  RAISE NOTICE 'IVFFlat index on creator_index.embedding: created';
END $$;
