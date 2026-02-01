# Database Schema Documentation

## Overview
This document describes the PostgreSQL database schema for the SafarCollab platform.

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   tenants   │       │   creators   │       │   brands    │
└──────┬──────┘       └──────┬───────┘       └──────┬──────┘
       │                     │                      │
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
       ┌────────▼────────┐      ┌────────▼────────┐
       │ social_accounts │      │   campaigns     │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │     posts       │      │ campaign_offers │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │metrics_history  │      │   payments      │
       └─────────────────┘      └─────────────────┘
```

## Core Tables

### tenants
Multi-tenant organization table for brands and agencies.

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('brand', 'agency', 'platform_admin')),
  domain VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  platform_cut_pct DECIMAL(5,2) DEFAULT 12.00,
  billing_email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_tenants_domain ON tenants(domain);
```

### users
Common user table for authentication (polymorphic - can be creator, brand user, or admin).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('creator', 'brand_admin', 'brand_member', 'platform_admin')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
```

### creators
Creator profile and metadata.

```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  bio TEXT,
  profile_image_url TEXT,
  primary_platform VARCHAR(50),
  categories VARCHAR(100)[] DEFAULT '{}',
  languages VARCHAR(50)[] DEFAULT '{}',
  base_rate_inr DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  location_city VARCHAR(100),
  location_state VARCHAR(100),
  location_country VARCHAR(3) DEFAULT 'IN',
  kyc_status VARCHAR(50) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  kyc_documents JSONB DEFAULT '[]',
  tax_info JSONB DEFAULT '{}', -- PAN, GST number, etc.
  payout_methods JSONB DEFAULT '[]',
  availability_status VARCHAR(50) DEFAULT 'available',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creators_user ON creators(user_id);
CREATE INDEX idx_creators_categories ON creators USING GIN(categories);
CREATE INDEX idx_creators_kyc_status ON creators(kyc_status);
```

### brands
Brand profiles.

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  industry VARCHAR(100),
  website VARCHAR(255),
  description TEXT,
  company_size VARCHAR(50),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brands_tenant ON brands(tenant_id);
```

### social_accounts
Connected social media accounts for creators.

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'twitter', 'linkedin')),
  platform_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_url TEXT,
  profile_image_url TEXT,
  follower_count BIGINT DEFAULT 0,
  following_count BIGINT DEFAULT 0,
  total_posts BIGINT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  business_account BOOLEAN DEFAULT FALSE,
  access_token_encrypted TEXT, -- Encrypted with KMS
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  permissions_granted TEXT[] DEFAULT '{}',
  connection_status VARCHAR(50) DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  sync_frequency_hours INTEGER DEFAULT 24,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_creator ON social_accounts(creator_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_sync ON social_accounts(next_sync_at) WHERE connection_status = 'active';
```

### posts
Normalized social media posts across all platforms.

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  post_type VARCHAR(50) CHECK (post_type IN ('image', 'video', 'carousel', 'story', 'reel', 'short', 'live')),
  published_at TIMESTAMP NOT NULL,
  caption TEXT,
  hashtags VARCHAR(100)[] DEFAULT '{}',
  mentions VARCHAR(100)[] DEFAULT '{}',
  media_urls JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  
  -- Normalized metrics
  views BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  
  -- Audience demographics (from platform insights)
  audience_demographics JSONB DEFAULT '{}',
  
  -- Raw data reference
  raw_payload_url TEXT, -- S3 URL to raw JSON
  raw_payload_hash VARCHAR(64),
  
  -- Campaign association
  campaign_id UUID REFERENCES campaigns(id),
  is_sponsored BOOLEAN DEFAULT FALSE,
  disclosure_compliant BOOLEAN,
  
  metrics_last_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX idx_posts_social_account ON posts(social_account_id);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_engagement ON posts(engagement_rate DESC NULLS LAST);
```

### metrics_history
Time-series metrics for tracking post performance over time.

```sql
CREATE TABLE metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  views BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_history_post ON metrics_history(post_id);
CREATE INDEX idx_metrics_history_recorded ON metrics_history(recorded_at DESC);
-- Partition by month for scalability
-- CREATE TABLE metrics_history_2024_01 PARTITION OF metrics_history FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### campaigns
Brand campaigns looking for creators.

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objective VARCHAR(100), -- awareness, engagement, conversions, traffic
  
  budget_min_inr DECIMAL(12,2),
  budget_max_inr DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'INR',
  
  start_date DATE,
  end_date DATE,
  application_deadline DATE,
  
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  
  -- Targeting
  target_demographics JSONB DEFAULT '{}', -- age, gender, location, interests
  target_platforms VARCHAR(50)[] DEFAULT '{}',
  target_categories VARCHAR(100)[] DEFAULT '{}',
  min_follower_count BIGINT,
  max_follower_count BIGINT,
  required_engagement_rate DECIMAL(5,4),
  
  -- Content requirements
  content_requirements JSONB DEFAULT '{}', -- deliverables, formats, guidelines
  hashtags_required VARCHAR(100)[] DEFAULT '{}',
  disclosure_required BOOLEAN DEFAULT TRUE,
  
  -- Platform settings
  platform_cut_pct DECIMAL(5,2), -- Override tenant default if needed
  auto_match_enabled BOOLEAN DEFAULT TRUE,
  
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
```

### campaign_offers
Offers/invitations sent from brands to creators.

```sql
CREATE TABLE campaign_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  state VARCHAR(50) DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'declined', 'negotiating', 'completed', 'cancelled')),
  
  proposed_fee_inr DECIMAL(10,2) NOT NULL,
  negotiated_fee_inr DECIMAL(10,2),
  final_fee_inr DECIMAL(10,2),
  platform_cut_pct DECIMAL(5,2) NOT NULL,
  platform_fee_inr DECIMAL(10,2),
  creator_payout_inr DECIMAL(10,2),
  
  deliverables JSONB DEFAULT '[]', -- Array of expected deliverables
  deliverables_submitted JSONB DEFAULT '[]',
  
  -- Recommendation context
  match_score DECIMAL(5,2),
  recommendation VARCHAR(50), -- accept, consider, decline
  recommendation_reasons JSONB DEFAULT '[]',
  estimated_reach BIGINT,
  estimated_engagement BIGINT,
  estimated_conversions INTEGER,
  
  -- Timeline
  offer_sent_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline DATE,
  
  notes TEXT,
  creator_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(campaign_id, creator_id)
);

CREATE INDEX idx_campaign_offers_campaign ON campaign_offers(campaign_id);
CREATE INDEX idx_campaign_offers_creator ON campaign_offers(creator_id);
CREATE INDEX idx_campaign_offers_state ON campaign_offers(state);
```

### match_scores
Precomputed match scores for campaign-creator pairs.

```sql
CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  total_score DECIMAL(5,2) NOT NULL,
  audience_fit_score DECIMAL(5,2),
  engagement_score DECIMAL(5,2),
  content_fit_score DECIMAL(5,2),
  authenticity_score DECIMAL(5,2),
  
  recommendation VARCHAR(50) CHECK (recommendation IN ('accept', 'consider', 'decline')),
  reasons JSONB DEFAULT '[]',
  
  estimated_reach BIGINT,
  estimated_engagement BIGINT,
  estimated_conversions INTEGER,
  estimated_cpm DECIMAL(10,2),
  estimated_cpe DECIMAL(10,2),
  
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(campaign_id, creator_id, generated_at)
);

CREATE INDEX idx_match_scores_campaign ON match_scores(campaign_id);
CREATE INDEX idx_match_scores_creator ON match_scores(creator_id);
CREATE INDEX idx_match_scores_score ON match_scores(total_score DESC);
CREATE INDEX idx_match_scores_generated ON match_scores(generated_at DESC);
```

### payments
Payment transactions including escrow.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES campaign_offers(id),
  
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('escrow_deposit', 'creator_payout', 'platform_fee', 'refund')),
  
  amount_inr DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  -- Payment provider details
  provider VARCHAR(50), -- razorpay, stripe
  provider_transaction_id VARCHAR(255),
  provider_payment_method VARCHAR(100),
  provider_metadata JSONB DEFAULT '{}',
  
  -- Escrow tracking
  escrow_held_amount DECIMAL(12,2),
  escrow_released_amount DECIMAL(12,2),
  escrow_status VARCHAR(50),
  
  -- Timestamps
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  failure_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_offer ON payments(offer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_txn ON payments(provider_transaction_id);
```

### invoices
Generated invoices for payments.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  creator_id UUID REFERENCES creators(id),
  brand_id UUID REFERENCES brands(id),
  
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  invoice_type VARCHAR(50) CHECK (invoice_type IN ('creator_payout', 'brand_charge', 'platform_fee')),
  
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- GST details
  gst_number VARCHAR(50),
  gstin VARCHAR(15),
  place_of_supply VARCHAR(100),
  
  -- Tax breakdown
  cgst DECIMAL(12,2) DEFAULT 0,
  sgst DECIMAL(12,2) DEFAULT 0,
  igst DECIMAL(12,2) DEFAULT 0,
  
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  pdf_url TEXT,
  
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'paid', 'cancelled')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_payment ON invoices(payment_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_creator ON invoices(creator_id);
CREATE INDEX idx_invoices_brand ON invoices(brand_id);
```

### sync_jobs
Track background data sync jobs.

```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_sync', 'incremental_sync', 'metrics_update')),
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  posts_fetched INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  posts_updated INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  error_details JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_social_account ON sync_jobs(social_account_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);
```

### audit_logs
System-wide audit trail.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

## Initial Migration Script

See `backend/migrations/001_initial_schema.sql` for the complete migration.

## Data Retention & Archival

- **posts**: Archive posts older than 2 years to cold storage
- **metrics_history**: Partition by month; aggregate to daily after 6 months
- **audit_logs**: Retain for 3 years; archive older
- **sync_jobs**: Delete completed jobs after 30 days

## Indexes Strategy

- Primary keys: UUID with index
- Foreign keys: All indexed
- Frequently queried fields: Indexed
- JSONB fields: GIN indexes where needed
- Time-series: DESC indexes for recent-first queries

## Scaling Considerations

1. **Partitioning**: `metrics_history` partitioned by month
2. **Read Replicas**: For analytics queries
3. **Caching**: Redis for frequently accessed data
4. **Archival**: Move old data to S3/ClickHouse
5. **Connection Pooling**: PgBouncer for connection management
