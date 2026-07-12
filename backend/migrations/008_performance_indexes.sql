-- ============================================================
-- Migration 008: Performance Indexes for High-Frequency Queries
-- ============================================================
-- These indexes speed up the most frequent queries:
--   - PlanLimitsGuard: count(campaigns) by brand_id + status on every request
--   - BillingService: find brand by user_id, razorpay_subscription_id
--   - CampaignsService.findByBrand: filter campaigns by brand_id
-- ============================================================

-- Composite index for PlanLimitsGuard (brand_id + status) — most critical
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_brand_status
  ON campaigns (brand_id, status);

-- Index for campaigns ordered by creation date (used in findAll, findActive, search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_created_at
  ON campaigns (created_at DESC);

-- Index for brand lookup by user_id (used on virtually every authenticated brand request)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brands_user_id
  ON brands (user_id);

-- Index for webhook lookup by subscription ID
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brands_razorpay_subscription_id
  ON brands (razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

-- Index for invite lookup by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_invites_email
  ON brand_invites (email);

-- Index for user lookup by email (used on every login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users (email);

-- Index for discovery_jobs by campaign_id (used in discovery status polling)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_discovery_jobs_campaign_id
  ON discovery_jobs (campaign_id, created_at DESC);
