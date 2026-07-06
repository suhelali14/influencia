-- ============================================================
-- Migration 007: Brand Subscriptions
-- ============================================================

ALTER TABLE brands ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255) NULL;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255) NULL;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ai_discovery_limit_used INT DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS campaign_limit_used INT DEFAULT 0;

-- Index subscription fields for fast validation checks
CREATE INDEX IF NOT EXISTS idx_brands_subscription ON brands (subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_brands_razorpay_sub ON brands (razorpay_subscription_id);
