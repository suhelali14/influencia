CREATE TABLE IF NOT EXISTS budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  total_budget DECIMAL(12, 2) NOT NULL,
  target_metric VARCHAR(50) DEFAULT 'reach',
  allocated_budget DECIMAL(12, 2) NOT NULL,
  predicted_reach BIGINT NOT NULL,
  predicted_engagement DECIMAL(5, 2) NOT NULL,
  predicted_roi DECIMAL(6, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_plan_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES budget_plans(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  allocated_amount DECIMAL(12, 2) NOT NULL,
  expected_impressions BIGINT NOT NULL,
  expected_engagements BIGINT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_budget_plans_campaign ON budget_plans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_budget_plan_allocations_plan ON budget_plan_allocations(plan_id);
