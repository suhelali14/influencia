# SafarCollab - Product Backlog & User Stories

## Overview
This document contains the complete product backlog organized by milestones with user stories, acceptance criteria, and technical tasks for the SafarCollab influencer marketplace MVP.

---

## MILESTONE 1: Foundation & Creator Onboarding (Weeks 1-4)

### Epic 1.1: Authentication & User Management

#### Story 1.1.1: User Registration
**As a** new user  
**I want to** register with email/password  
**So that** I can create an account as either a creator or brand

**Acceptance Criteria:**
- [ ] User can register with email, password, and role (creator/brand_admin)
- [ ] Password must be minimum 8 characters with complexity requirements
- [ ] Email must be unique across the system
- [ ] Verification email is sent upon registration
- [ ] User receives JWT token upon successful registration
- [ ] Appropriate error messages for validation failures

**Technical Tasks:**
- [ ] Create `users` and `tenants` database tables
- [ ] Implement password hashing with bcrypt (10 rounds)
- [ ] Create POST `/api/v1/auth/signup` endpoint
- [ ] Implement email validation and duplicate check
- [ ] Set up email service (SendGrid/SES) for verification emails
- [ ] Generate JWT with 7-day expiration
- [ ] Write unit tests for signup validation
- [ ] Write E2E test for signup flow

**Story Points:** 5  
**Priority:** P0 (Critical)

---

#### Story 1.1.2: User Login
**As a** registered user  
**I want to** login with my credentials  
**So that** I can access my account

**Acceptance Criteria:**
- [ ] User can login with email and password
- [ ] Receive JWT access token and refresh token
- [ ] Login fails with appropriate error for invalid credentials
- [ ] Last login timestamp is updated
- [ ] Rate limiting prevents brute force attacks (5 attempts per 15 min)

**Technical Tasks:**
- [ ] Create POST `/api/v1/auth/login` endpoint
- [ ] Implement password comparison logic
- [ ] Generate access token (7d) and refresh token (30d)
- [ ] Update `last_login_at` field
- [ ] Implement rate limiting middleware (Redis-based)
- [ ] Write tests for login scenarios

**Story Points:** 3  
**Priority:** P0

---

#### Story 1.1.3: JWT Token Refresh
**As a** logged-in user  
**I want to** refresh my access token  
**So that** I can maintain my session without re-logging in

**Acceptance Criteria:**
- [ ] User can refresh access token using refresh token
- [ ] New access token is returned
- [ ] Invalid/expired refresh token returns 401
- [ ] Refresh token is single-use (rotation)

**Technical Tasks:**
- [ ] Create POST `/api/v1/auth/refresh` endpoint
- [ ] Implement refresh token validation
- [ ] Implement token rotation strategy
- [ ] Store refresh token hash in database
- [ ] Write tests

**Story Points:** 3  
**Priority:** P0

---

### Epic 1.2: Creator Profile & Onboarding

#### Story 1.2.1: Creator Profile Creation
**As a** creator  
**I want to** set up my profile with personal and professional details  
**So that** brands can discover and learn about me

**Acceptance Criteria:**
- [ ] Creator can input name, bio, categories, languages, base rate
- [ ] Profile image upload supported (max 5MB, JPG/PNG)
- [ ] Location fields (city, state, country)
- [ ] Categories support multi-select from predefined list
- [ ] Profile is saved and retrievable
- [ ] Profile completion percentage shown

**Technical Tasks:**
- [ ] Create `creators` table with all fields
- [ ] Create POST `/api/v1/creators` endpoint
- [ ] Implement file upload to S3 for profile images
- [ ] Create categories master data
- [ ] Create GET `/api/v1/creators/me` endpoint
- [ ] Calculate profile completion percentage
- [ ] Write validation for required fields
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 1.2.2: Social Account Connection - Instagram
**As a** creator  
**I want to** connect my Instagram business account via OAuth  
**So that** the platform can access my content and metrics

**Acceptance Criteria:**
- [ ] Creator can initiate Instagram OAuth flow
- [ ] Redirect to Instagram authorization page
- [ ] Required permissions displayed: `instagram_basic`, `instagram_manage_insights`
- [ ] After authorization, account is connected and shown in dashboard
- [ ] Error handling for denied permissions
- [ ] Support for manual CSV upload if OAuth fails

**Technical Tasks:**
- [ ] Register app with Facebook Developer Platform
- [ ] Create `social_accounts` table
- [ ] Implement GET `/api/v1/social/instagram/oauth-url` endpoint
- [ ] Implement POST `/api/v1/social/instagram/exchange-token` endpoint
- [ ] Store encrypted access/refresh tokens (AWS KMS)
- [ ] Implement Instagram Graph API adapter
- [ ] Create fallback CSV upload endpoint
- [ ] Write integration tests with Instagram test accounts

**Story Points:** 13  
**Priority:** P0

---

#### Story 1.2.3: Social Account Connection - YouTube
**As a** creator  
**I want to** connect my YouTube channel via Google OAuth  
**So that** the platform can access my videos and analytics

**Acceptance Criteria:**
- [ ] Creator can initiate YouTube OAuth flow
- [ ] Required scopes: `youtube.readonly`, `yt-analytics.readonly`
- [ ] Channel details fetched and displayed
- [ ] Account connection status shown
- [ ] Support for multiple channels
- [ ] Fallback to manual entry if needed

**Technical Tasks:**
- [ ] Register app with Google Cloud Console
- [ ] Enable YouTube Data API v3 and YouTube Analytics API
- [ ] Implement GET `/api/v1/social/youtube/oauth-url` endpoint
- [ ] Implement POST `/api/v1/social/youtube/exchange-token` endpoint
- [ ] Create YouTube API adapter
- [ ] Fetch channel details on connection
- [ ] Write integration tests

**Story Points:** 13  
**Priority:** P0

---

### Epic 1.3: Data Ingestion Pipeline

#### Story 1.3.1: Instagram Post Ingestion
**As a** creator with connected Instagram  
**I want** my posts to be automatically synced  
**So that** brands can see my content and performance

**Acceptance Criteria:**
- [ ] System fetches last 50 posts on initial sync
- [ ] Posts normalized to common schema
- [ ] Metrics include: likes, comments, views, reach, impressions
- [ ] Media URLs stored
- [ ] Caption, hashtags extracted
- [ ] Sync status visible to creator
- [ ] Incremental sync scheduled every 24 hours

**Technical Tasks:**
- [ ] Create `posts` and `sync_jobs` tables
- [ ] Implement Instagram Graph API calls to fetch media
- [ ] Parse and normalize post data
- [ ] Store raw JSON in S3 with reference URL
- [ ] Calculate engagement rate
- [ ] Create background job queue (Bull/BullMQ with Redis)
- [ ] Implement sync job worker
- [ ] Schedule recurring sync jobs
- [ ] Handle rate limits with exponential backoff
- [ ] Write tests for data normalization

**Story Points:** 13  
**Priority:** P0

---

#### Story 1.3.2: YouTube Video Ingestion
**As a** creator with connected YouTube  
**I want** my videos to be automatically synced  
**So that** my YouTube performance is visible

**Acceptance Criteria:**
- [ ] Fetch recent videos (last 30 days on initial sync)
- [ ] Metrics: views, likes, comments, watch time
- [ ] Thumbnails stored
- [ ] Title and description parsed
- [ ] Sync status tracked

**Technical Tasks:**
- [ ] Implement YouTube Data API integration
- [ ] Fetch videos from `activities.list` and `videos.list`
- [ ] Fetch analytics from YouTube Analytics API
- [ ] Normalize to common post schema
- [ ] Store in database
- [ ] Queue sync jobs
- [ ] Handle API quotas and rate limits
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

#### Story 1.3.3: Manual CSV Upload Fallback
**As a** creator unable to connect via OAuth  
**I want to** upload my analytics via CSV  
**So that** I can still participate on the platform

**Acceptance Criteria:**
- [ ] Creator can download CSV template
- [ ] Upload CSV with posts and metrics
- [ ] System validates CSV format
- [ ] Data imported and normalized
- [ ] Validation errors shown clearly
- [ ] Manual flag set on imported posts

**Technical Tasks:**
- [ ] Create CSV template generator
- [ ] Create POST `/api/v1/social/upload-csv` endpoint
- [ ] Implement CSV parsing and validation
- [ ] Import validated data to database
- [ ] Set `connection_status` = 'manual'
- [ ] Write validation tests

**Story Points:** 8  
**Priority:** P1

---

#### Story 1.3.4: Creator Dashboard - Content Feed
**As a** creator  
**I want to** view all my synced posts in one place  
**So that** I can track my content and performance

**Acceptance Criteria:**
- [ ] Dashboard shows all posts across platforms
- [ ] Posts sortable by date, engagement, platform
- [ ] Filter by platform, date range
- [ ] Key metrics displayed per post
- [ ] Sync status and last sync time shown
- [ ] Manual sync trigger available

**Technical Tasks:**
- [ ] Create GET `/api/v1/creators/me/posts` endpoint with pagination
- [ ] Implement filters and sorting
- [ ] Create React dashboard component
- [ ] Display post cards with metrics
- [ ] Add "Sync Now" button
- [ ] Show sync job status
- [ ] Write frontend tests

**Story Points:** 8  
**Priority:** P0

---

### Milestone 1 Deliverables
- [ ] User can sign up, login, and manage sessions
- [ ] Creator can create profile and connect Instagram + YouTube
- [ ] Posts automatically synced with normalized metrics
- [ ] Creator dashboard displays synced content
- [ ] Manual CSV upload works as fallback
- [ ] All APIs documented in Swagger
- [ ] Unit and integration tests with >80% coverage

**Total Story Points:** 87  
**Duration:** 4 weeks  
**Team:** 2 backend, 2 frontend, 1 QA

---

## MILESTONE 2: Marketplace & Matching Engine (Weeks 5-10)

### Epic 2.1: Brand Onboarding

#### Story 2.1.1: Brand Profile Creation
**As a** brand admin  
**I want to** create my company profile  
**So that** creators know who I am

**Acceptance Criteria:**
- [ ] Brand can input company name, logo, industry, website
- [ ] Company size and description fields
- [ ] Logo upload (max 2MB)
- [ ] Profile saved to tenant
- [ ] Profile editable

**Technical Tasks:**
- [ ] Create `brands` table
- [ ] Create POST `/api/v1/brands` endpoint
- [ ] Implement logo upload to S3
- [ ] Link brand to tenant
- [ ] Create brand profile page (React)
- [ ] Write tests

**Story Points:** 5  
**Priority:** P0

---

### Epic 2.2: Campaign Creation

#### Story 2.2.1: Campaign Creation Wizard
**As a** brand  
**I want to** create a new campaign with target audience and budget  
**So that** I can find suitable creators

**Acceptance Criteria:**
- [ ] Multi-step wizard: Basic Info → Target Audience → Budget → Content
- [ ] Required fields: title, objective, budget range, dates
- [ ] Target demographics: age, gender, location, interests
- [ ] Target platforms and categories
- [ ] Min follower count and engagement rate filters
- [ ] Draft campaigns can be saved
- [ ] Campaign can be published to go "active"

**Technical Tasks:**
- [ ] Create `campaigns` table
- [ ] Create POST `/api/v1/campaigns` endpoint
- [ ] Implement multi-step form in React
- [ ] Validate budget ranges
- [ ] Implement draft/active state transitions
- [ ] Create GET `/api/v1/campaigns` with filters
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

#### Story 2.2.2: Content Requirements Specification
**As a** brand  
**I want to** specify content deliverables  
**So that** creators know what I expect

**Acceptance Criteria:**
- [ ] Specify deliverable types (posts, stories, reels, videos)
- [ ] Quantity per type
- [ ] Required hashtags
- [ ] Disclosure requirements checkbox
- [ ] Guidelines text field
- [ ] Preview of requirements shown

**Technical Tasks:**
- [ ] Add `content_requirements` JSONB field to campaigns
- [ ] Create deliverables specification UI
- [ ] Validate deliverable structure
- [ ] Store in database
- [ ] Display in campaign details
- [ ] Write tests

**Story Points:** 5  
**Priority:** P0

---

### Epic 2.3: Match & Recommendation Engine

#### Story 2.3.1: Rule-Based Scoring Algorithm (MVP)
**As the** system  
**I want to** score creator-campaign matches  
**So that** I can recommend best fits

**Acceptance Criteria:**
- [ ] Algorithm scores based on:
  - Audience fit (40%): demographics overlap
  - Engagement score (25%): avg engagement rate
  - Content fit (20%): category overlap
  - Authenticity (15%): follower/engagement ratio
- [ ] Scores range 0-100
- [ ] Recommendation: Accept (>75), Consider (50-75), Decline (<50)
- [ ] Reasons array explains score
- [ ] Estimated reach/engagement calculated

**Technical Tasks:**
- [ ] Create `match_scores` table
- [ ] Implement scoring function in TypeScript/Python
- [ ] Calculate audience overlap from demographics
- [ ] Calculate avg engagement from recent posts (90 days)
- [ ] Category matching logic
- [ ] Authenticity heuristics (follower growth, engagement ratio)
- [ ] Generate reasons array
- [ ] Create POST `/api/v1/campaigns/{id}/calculate-matches` job
- [ ] Write unit tests for scoring logic
- [ ] Write tests with sample data

**Story Points:** 13  
**Priority:** P0

---

#### Story 2.3.2: Campaign Shortlist for Brands
**As a** brand  
**I want to** see AI-recommended creators for my campaign  
**So that** I can quickly find suitable partners

**Acceptance Criteria:**
- [ ] Shortlist shows top 20 creators by match score
- [ ] Each entry shows: creator profile, score, recommendation, reasons
- [ ] Filter by recommendation type (Accept, Consider)
- [ ] Sort by score, followers, engagement rate
- [ ] Click to view creator full profile
- [ ] Send offer button available

**Technical Tasks:**
- [ ] Create GET `/api/v1/campaigns/{id}/matches` endpoint
- [ ] Trigger match calculation job on campaign publish
- [ ] Cache results for 24 hours
- [ ] Create shortlist UI component
- [ ] Display match cards with scores
- [ ] Implement filters and sorting
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 2.3.3: Recommended Campaigns for Creators
**As a** creator  
**I want to** see campaigns recommended for me  
**So that** I can apply or accept offers

**Acceptance Criteria:**
- [ ] Dashboard shows top 10 recommended campaigns
- [ ] Each shows: campaign title, brand, match score, reasons
- [ ] Recommendation (Accept/Consider) highlighted
- [ ] Estimated payout range shown
- [ ] Click to view campaign details
- [ ] Apply/Express Interest button

**Technical Tasks:**
- [ ] Create GET `/api/v1/creators/me/recommended-campaigns` endpoint
- [ ] Calculate match scores for active campaigns
- [ ] Sort by score descending
- [ ] Create recommendations component (React)
- [ ] Display campaign cards
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

### Epic 2.4: Offer Management

#### Story 2.4.1: Send Offer to Creator
**As a** brand  
**I want to** send a collaboration offer to a creator  
**So that** I can invite them to my campaign

**Acceptance Criteria:**
- [ ] Brand can select creator from shortlist
- [ ] Specify proposed fee
- [ ] Specify deliverables (type, quantity, due dates)
- [ ] Add custom notes
- [ ] Set acceptance deadline
- [ ] Offer sent and creator notified via email
- [ ] Platform cut % calculated automatically

**Technical Tasks:**
- [ ] Create `campaign_offers` table
- [ ] Create POST `/api/v1/campaigns/{id}/offers` endpoint
- [ ] Calculate platform fee from `platform_cut_pct`
- [ ] Calculate creator payout
- [ ] Send notification email to creator
- [ ] Create offer form UI
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 2.4.2: Creator Views Offers
**As a** creator  
**I want to** see all offers I've received  
**So that** I can decide which to accept

**Acceptance Criteria:**
- [ ] Dashboard shows pending offers
- [ ] Each offer shows: campaign, brand, fee, deliverables, deadline
- [ ] Match score and recommendation visible
- [ ] Filter by state (pending, accepted, declined)
- [ ] Sort by date, fee

**Technical Tasks:**
- [ ] Create GET `/api/v1/offers/me` endpoint
- [ ] Include campaign and brand details
- [ ] Create offers list component
- [ ] Display offer cards
- [ ] Write tests

**Story Points:** 5  
**Priority:** P0

---

#### Story 2.4.3: Accept Offer
**As a** creator  
**I want to** accept a campaign offer  
**So that** I can start the collaboration

**Acceptance Criteria:**
- [ ] Creator can review offer details
- [ ] Option to negotiate fee (optional counter-offer)
- [ ] Accept button changes state to "accepted"
- [ ] Accepted timestamp recorded
- [ ] Brand notified via email
- [ ] Offer moves to "Active Campaigns" section

**Technical Tasks:**
- [ ] Create POST `/api/v1/offers/{id}/accept` endpoint
- [ ] Update state to 'accepted'
- [ ] Record `accepted_at` timestamp
- [ ] Send notification to brand
- [ ] Update UI state
- [ ] Write tests

**Story Points:** 5  
**Priority:** P0

---

#### Story 2.4.4: Decline Offer
**As a** creator  
**I want to** decline an offer  
**So that** I can pass on collaborations that don't fit

**Acceptance Criteria:**
- [ ] Decline button available
- [ ] Optional reason field
- [ ] State changes to "declined"
- [ ] Brand notified
- [ ] Offer removed from pending list

**Technical Tasks:**
- [ ] Create POST `/api/v1/offers/{id}/decline` endpoint
- [ ] Update state to 'declined'
- [ ] Record `declined_at` and reason
- [ ] Send notification to brand
- [ ] Write tests

**Story Points:** 3  
**Priority:** P0

---

### Epic 2.5: Admin Configuration

#### Story 2.5.1: Configure Platform Commission
**As a** platform admin  
**I want to** set the platform commission percentage  
**So that** I can control revenue model

**Acceptance Criteria:**
- [ ] Admin can set global default `platform_cut_pct`
- [ ] Can override per tenant
- [ ] Can override per campaign
- [ ] Changes reflected in new offers
- [ ] Existing offers unaffected

**Technical Tasks:**
- [ ] Add admin role check middleware
- [ ] Create PATCH `/api/v1/admin/config/platform-cut` endpoint
- [ ] Update tenant-level setting
- [ ] Campaign creation inherits tenant setting
- [ ] Create admin config UI
- [ ] Write tests

**Story Points:** 5  
**Priority:** P1

---

### Milestone 2 Deliverables
- [ ] Brands can create campaigns with targeting
- [ ] AI matching engine generates scored shortlists
- [ ] Brands can send offers to creators
- [ ] Creators see recommended campaigns and offers
- [ ] Creators can accept/decline offers
- [ ] Platform commission configurable
- [ ] All features tested and documented

**Total Story Points:** 78  
**Duration:** 6 weeks  
**Team:** 2 backend, 2 frontend, 1 QA

---

## MILESTONE 3: Payments & Compliance (Weeks 11-16)

### Epic 3.1: Payment Integration

#### Story 3.1.1: Razorpay Integration Setup
**As the** system  
**I want to** integrate with Razorpay  
**So that** I can process payments in India

**Acceptance Criteria:**
- [ ] Razorpay account created and verified
- [ ] API keys configured in environment
- [ ] Webhook endpoint set up
- [ ] Test mode works correctly
- [ ] Production keys ready for deployment

**Technical Tasks:**
- [ ] Register with Razorpay
- [ ] Create test and production API keys
- [ ] Store keys in environment variables (encrypted)
- [ ] Set up webhook URL
- [ ] Implement webhook signature verification
- [ ] Write integration tests with Razorpay test mode

**Story Points:** 5  
**Priority:** P0

---

#### Story 3.1.2: Escrow Deposit
**As a** brand  
**I want to** deposit payment into escrow  
**So that** the creator knows payment is secured

**Acceptance Criteria:**
- [ ] Brand initiates payment for accepted offer
- [ ] Razorpay payment page opens
- [ ] Supports UPI, cards, netbanking
- [ ] Payment success creates escrow record
- [ ] Payment held until deliverables verified
- [ ] Brand sees payment status

**Technical Tasks:**
- [ ] Create `payments` table
- [ ] Create POST `/api/v1/payments/escrow` endpoint
- [ ] Call Razorpay Orders API
- [ ] Return payment link/checkout
- [ ] Handle webhook for payment success
- [ ] Create escrow record with status 'held'
- [ ] Update offer payment status
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

#### Story 3.1.3: Creator Payout
**As a** creator  
**I want to** receive payout after campaign completion  
**So that** I get paid for my work

**Acceptance Criteria:**
- [ ] After content verification, payout is triggered
- [ ] Creator payout = final_fee - platform_fee
- [ ] Payout via Razorpay Payouts API
- [ ] Creator bank details required
- [ ] Payout status tracked
- [ ] Creator notified on payout success

**Technical Tasks:**
- [ ] Implement Razorpay Payouts integration
- [ ] Create payout methods in creator profile
- [ ] Create POST `/api/v1/payments/escrow/release` endpoint
- [ ] Calculate creator payout and platform fee
- [ ] Trigger payout to creator account
- [ ] Update payment status to 'completed'
- [ ] Send confirmation email
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

### Epic 3.2: Content Verification

#### Story 3.2.1: Submit Deliverables
**As a** creator  
**I want to** mark deliverables as completed  
**So that** the brand can verify and release payment

**Acceptance Criteria:**
- [ ] Creator sees checklist of deliverables
- [ ] Can submit post URL for each deliverable
- [ ] Screenshot/proof upload optional
- [ ] Submission timestamp recorded
- [ ] Brand notified for review

**Technical Tasks:**
- [ ] Add `deliverables_submitted` JSONB to offers table
- [ ] Create POST `/api/v1/offers/{id}/deliverables` endpoint
- [ ] Store submission details
- [ ] Send notification to brand
- [ ] Create submission form UI
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 3.2.2: Brand Verifies Content
**As a** brand  
**I want to** verify that deliverables are completed  
**So that** I can approve payment release

**Acceptance Criteria:**
- [ ] Brand sees submitted deliverables
- [ ] Can view post URLs
- [ ] Approve or request changes
- [ ] Approval triggers payment release
- [ ] Rejection sends back to creator with notes

**Technical Tasks:**
- [ ] Create GET `/api/v1/offers/{id}/deliverables` endpoint
- [ ] Create POST `/api/v1/offers/{id}/approve` endpoint
- [ ] Create POST `/api/v1/offers/{id}/reject` endpoint
- [ ] On approval, call escrow release
- [ ] Update offer state to 'completed'
- [ ] Send notifications
- [ ] Create verification UI
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 3.2.3: Automated Post Verification (Basic)
**As the** system  
**I want to** automatically verify that sponsored posts exist  
**So that** I can reduce manual verification

**Acceptance Criteria:**
- [ ] System checks if submitted URL exists and is public
- [ ] Checks if required hashtags present
- [ ] Checks if disclosure text present (basic keyword search)
- [ ] Automated check results shown to brand
- [ ] Brand can override automated decision

**Technical Tasks:**
- [ ] Implement headless browser automation (Puppeteer)
- [ ] Fetch post HTML from URL
- [ ] Parse caption/text
- [ ] Check for required hashtags
- [ ] Check for disclosure keywords ("ad", "sponsored", "#ad")
- [ ] Store verification result
- [ ] Display in verification UI
- [ ] Write tests

**Story Points:** 13  
**Priority:** P1

---

### Epic 3.3: Compliance & KYC

#### Story 3.3.1: Creator KYC Submission
**As a** creator  
**I want to** submit KYC documents  
**So that** I can receive payouts legally

**Acceptance Criteria:**
- [ ] Creator can upload ID proof (Aadhaar, PAN, Passport)
- [ ] Upload photo/selfie
- [ ] Enter PAN and GST number (if applicable)
- [ ] Submission marked as 'submitted'
- [ ] Admin notified for review

**Technical Tasks:**
- [ ] Add KYC fields to creators table
- [ ] Create POST `/api/v1/creators/me/kyc` endpoint
- [ ] Upload documents to S3
- [ ] Update `kyc_status` to 'submitted'
- [ ] Send notification to admin
- [ ] Create KYC form UI
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 3.3.2: Admin KYC Review
**As a** platform admin  
**I want to** review and approve KYC submissions  
**So that** creators can receive payouts

**Acceptance Criteria:**
- [ ] Admin sees pending KYC submissions
- [ ] Can view uploaded documents
- [ ] Approve or reject with reason
- [ ] Creator notified of decision
- [ ] Approved creators can receive payouts

**Technical Tasks:**
- [ ] Create GET `/api/v1/admin/kyc/pending` endpoint
- [ ] Create POST `/api/v1/admin/kyc/{id}/approve` endpoint
- [ ] Create POST `/api/v1/admin/kyc/{id}/reject` endpoint
- [ ] Update `kyc_status`
- [ ] Send notification emails
- [ ] Create admin KYC review UI
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 3.3.3: GST Invoice Generation
**As a** creator  
**I want** GST-compliant invoices generated  
**So that** I can file taxes correctly

**Acceptance Criteria:**
- [ ] Invoice auto-generated on payout
- [ ] Contains: invoice number, date, GST details, amount breakdown
- [ ] CGST/SGST for intra-state, IGST for inter-state
- [ ] PDF downloadable
- [ ] Stored in S3

**Technical Tasks:**
- [ ] Create `invoices` table
- [ ] Implement invoice number generation (sequential)
- [ ] Calculate GST based on creator/brand location
- [ ] Generate PDF using library (PDFKit/Puppeteer)
- [ ] Upload to S3
- [ ] Create GET `/api/v1/invoices/{id}/pdf` endpoint
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

#### Story 3.3.4: Disclosure Enforcement
**As the** system  
**I want to** remind creators about ASCI disclosure requirements  
**So that** they remain compliant

**Acceptance Criteria:**
- [ ] Before accepting offer, creator sees disclosure reminder
- [ ] Checkbox to confirm understanding
- [ ] Disclosure guidelines link provided
- [ ] Post verification checks for disclosure
- [ ] Non-compliance flagged to brand

**Technical Tasks:**
- [ ] Create disclosure guidelines content
- [ ] Add disclosure_required flag to campaigns
- [ ] Show modal on offer accept
- [ ] Store acknowledgement
- [ ] Add disclosure check to post verification
- [ ] Write tests

**Story Points:** 5  
**Priority:** P1

---

### Epic 3.4: Dashboards & Reporting

#### Story 3.4.1: Creator Earnings Dashboard
**As a** creator  
**I want to** see my earnings and payout history  
**So that** I can track my income

**Acceptance Criteria:**
- [ ] Dashboard shows total earnings, pending, completed
- [ ] List of all payouts with dates and amounts
- [ ] Filter by date range
- [ ] Download invoices
- [ ] Upcoming payouts visible

**Technical Tasks:**
- [ ] Create GET `/api/v1/creators/me/earnings` endpoint
- [ ] Aggregate payment data
- [ ] Create earnings dashboard component
- [ ] Display charts (total over time)
- [ ] List payouts with download links
- [ ] Write tests

**Story Points:** 8  
**Priority:** P0

---

#### Story 3.4.2: Brand Campaign Analytics
**As a** brand  
**I want to** see my campaign performance  
**So that** I can measure ROI

**Acceptance Criteria:**
- [ ] Campaign detail page shows analytics
- [ ] Metrics: total reach, engagement, conversions, spend
- [ ] List of creators with their performance
- [ ] Export report as PDF/CSV
- [ ] Charts for key metrics

**Technical Tasks:**
- [ ] Create GET `/api/v1/analytics/campaigns/{id}` endpoint
- [ ] Aggregate post metrics for campaign
- [ ] Calculate total spend and platform fees
- [ ] Create analytics component
- [ ] Implement charts (Chart.js/Recharts)
- [ ] Implement export functionality
- [ ] Write tests

**Story Points:** 13  
**Priority:** P0

---

#### Story 3.4.3: Admin Platform Dashboard
**As a** platform admin  
**I want to** see overall platform metrics  
**So that** I can monitor business health

**Acceptance Criteria:**
- [ ] Dashboard shows: total users, creators, brands, campaigns
- [ ] GMV (Gross Merchandise Value)
- [ ] Platform fees collected
- [ ] Active campaigns count
- [ ] Recent signups and activity
- [ ] Charts for trends

**Technical Tasks:**
- [ ] Create GET `/api/v1/admin/analytics/platform` endpoint
- [ ] Aggregate metrics across tenants
- [ ] Create admin dashboard page
- [ ] Display KPIs and charts
- [ ] Write tests

**Story Points:** 8  
**Priority:** P1

---

### Milestone 3 Deliverables
- [ ] Escrow payment flow working (deposit → hold → release)
- [ ] Content verification with approval workflow
- [ ] KYC submission and admin review
- [ ] GST-compliant invoice generation
- [ ] ASCI disclosure enforcement
- [ ] Creator earnings and brand analytics dashboards
- [ ] All payment flows tested end-to-end

**Total Story Points:** 112  
**Duration:** 6 weeks  
**Team:** 2 backend, 2 frontend, 1 data engineer, 1 QA

---

## MILESTONE 4: Scale & Intelligence (Ongoing)

### Epic 4.1: TikTok Integration

#### Story 4.1.1: TikTok OAuth Connection
**As a** creator  
**I want to** connect my TikTok account  
**So that** my TikTok content is included

**Acceptance Criteria:**
- [ ] OAuth flow for TikTok
- [ ] Account connected and shown
- [ ] Follower count fetched

**Technical Tasks:**
- [ ] Register with TikTok for Developers
- [ ] Implement OAuth flow
- [ ] Create TikTok API adapter
- [ ] Write tests

**Story Points:** 13  
**Priority:** P2

---

#### Story 4.1.2: TikTok Video Ingestion
**As a** creator  
**I want** my TikTok videos synced  
**So that** brands see my TikTok performance

**Acceptance Criteria:**
- [ ] Videos fetched via API
- [ ] Metrics normalized
- [ ] Displayed in dashboard

**Technical Tasks:**
- [ ] Implement TikTok video fetch
- [ ] Normalize data
- [ ] Queue sync jobs
- [ ] Write tests

**Story Points:** 13  
**Priority:** P2

---

### Epic 4.2: ML-Powered Scoring

#### Story 4.2.1: Collect Ground Truth Data
**As the** system  
**I want to** track campaign outcomes  
**So that** I can train ML models

**Acceptance Criteria:**
- [ ] Conversions tracked via UTM parameters
- [ ] Campaign ROI calculated
- [ ] Data exported for model training

**Technical Tasks:**
- [ ] Add UTM parameter generation
- [ ] Track conversions via pixels/links
- [ ] Store outcome data
- [ ] Export training dataset
- [ ] Write tests

**Story Points:** 13  
**Priority:** P2

---

#### Story 4.2.2: Train XGBoost Model for Match Prediction
**As a** data scientist  
**I want to** train a model to predict campaign success  
**So that** recommendations improve over time

**Acceptance Criteria:**
- [ ] Model trained on historical data
- [ ] Features: audience fit, engagement, content fit, etc.
- [ ] Target: conversion rate or ROI
- [ ] Model accuracy >75%
- [ ] Model deployed to prediction service

**Technical Tasks:**
- [ ] Extract features from database
- [ ] Train XGBoost model in Python
- [ ] Evaluate model performance
- [ ] Save model artifact
- [ ] Create prediction API service
- [ ] Integrate with scoring function
- [ ] Write tests

**Story Points:** 21  
**Priority:** P2

---

### Epic 4.3: Advanced Analytics

#### Story 4.3.1: Audience Demographics Insights
**As a** brand  
**I want to** see creator audience demographics  
**So that** I can ensure audience fit

**Acceptance Criteria:**
- [ ] Age distribution chart
- [ ] Gender breakdown
- [ ] Top locations
- [ ] Interests/affinities

**Technical Tasks:**
- [ ] Parse demographics from platform APIs
- [ ] Store in `audience_demographics` JSON
- [ ] Create analytics endpoint
- [ ] Create visualization components
- [ ] Write tests

**Story Points:** 13  
**Priority:** P2

---

### Epic 4.4: Fraud Detection

#### Story 4.4.1: Detect Fake Followers
**As the** system  
**I want to** detect suspicious follower patterns  
**So that** I can flag potentially fraudulent accounts

**Acceptance Criteria:**
- [ ] Flag accounts with sudden follower spikes
- [ ] Flag low engagement relative to followers
- [ ] Flag accounts with bot-like engagement patterns
- [ ] Admin notified of flagged accounts

**Technical Tasks:**
- [ ] Implement follower growth tracking
- [ ] Calculate engagement/follower ratio
- [ ] Define thresholds for anomalies
- [ ] Create fraud detection job
- [ ] Flag accounts in database
- [ ] Create admin review UI
- [ ] Write tests

**Story Points:** 13  
**Priority:** P2

---

### Milestone 4 Deliverables (Post-MVP)
- [ ] TikTok integration complete
- [ ] ML model deployed for improved match scoring
- [ ] Advanced audience analytics
- [ ] Fraud detection system
- [ ] Webhooks for real-time sync
- [ ] Performance optimizations for scale

**Total Story Points:** ~100+  
**Duration:** Ongoing iterations  
**Team:** Full team + ML engineer

---

## TECHNICAL DEBT & INFRASTRUCTURE BACKLOG

### Infrastructure Stories

#### INF-1: CI/CD Pipeline Setup
- [ ] GitHub Actions workflows for backend tests
- [ ] Frontend build and test pipeline
- [ ] Automated deployments to staging/production
- [ ] Docker image builds
**Story Points:** 8

#### INF-2: Database Backups & Disaster Recovery
- [ ] Automated daily backups to S3
- [ ] Point-in-time recovery setup
- [ ] Backup restoration testing
**Story Points:** 5

#### INF-3: Monitoring & Alerting
- [ ] Set up Prometheus metrics collection
- [ ] Grafana dashboards for key metrics
- [ ] Sentry for error tracking
- [ ] PagerDuty/Slack alerts for critical issues
**Story Points:** 8

#### INF-4: Load Testing
- [ ] Create load test scripts (k6/Artillery)
- [ ] Test API endpoints at scale
- [ ] Identify bottlenecks
- [ ] Optimize database queries
**Story Points:** 13

#### INF-5: Security Audit
- [ ] OWASP security review
- [ ] Penetration testing
- [ ] Secret rotation strategy
- [ ] Security headers and CSP
**Story Points:** 13

---

## APPENDIX: Estimation Guidelines

**Story Points Reference:**
- 1-2 points: Trivial, <4 hours
- 3-5 points: Small, <1 day
- 8 points: Medium, 1-2 days
- 13 points: Large, 2-4 days
- 21 points: Very large, should be split further

**Definition of Done:**
- [ ] Code written and peer-reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests for API endpoints
- [ ] API documentation updated
- [ ] Frontend components have tests
- [ ] Passes linting and type checks
- [ ] Deployed to staging and smoke tested
- [ ] Product owner approval

---

## SPRINT PLANNING TEMPLATE

### Sprint N (2 weeks)

**Sprint Goal:** [One-sentence sprint objective]

**Committed Stories:**
- [ ] Story ID - Story Title (X points)
- [ ] Story ID - Story Title (X points)

**Total Points:** [Sum]  
**Team Velocity:** [Historical average]  
**Sprint Capacity:** [Adjusted for holidays/PTO]

**Daily Standup Format:**
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

**Sprint Review:**
- Demo completed stories
- Gather feedback
- Accept/reject stories

**Sprint Retrospective:**
- What went well?
- What could be improved?
- Action items for next sprint

---

**End of Backlog Document**
