# Influencia — Complete Application Documentation

> **Version**: 2.0 (India-Trained ML Models Integrated)  
> **Last Updated**: April 5, 2026  
> **Author**: Auto-generated from full codebase audit

---

## Table of Contents

1. [What is Influencia?](#1-what-is-influencia)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Complete User Flows](#4-complete-user-flows)
5. [Backend (NestJS) — Full API Reference](#5-backend-nestjs--full-api-reference)
6. [AI/ML System — Models, Training & Inference](#6-aiml-system--models-training--inference)
7. [Frontend (React) — Pages & Components](#7-frontend-react--pages--components)
8. [Database Schema](#8-database-schema)
9. [ML Model Inventory & Integration Status](#9-ml-model-inventory--integration-status)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Known Issues & Fixes Applied](#12-known-issues--fixes-applied)

---

## 1. What is Influencia?

Influencia is a **full-stack AI-powered influencer marketing platform** that intelligently matches brands with creators (influencers) for marketing campaigns. It uses:

- **Machine Learning** (XGBoost, RandomForest, Neural Networks) for match scoring
- **Google Gemini AI** for generating natural-language reports and risk assessments
- **Semantic text matching** (BERT/SentenceTransformers) for content relevance
- **Multi-tenant architecture** for brands and agencies

### Core Value Proposition

| For Brands | For Creators |
|---|---|
| AI-powered creator discovery & ranking | AI-recommended campaigns matching their niche |
| Detailed AI analysis reports with ROI predictions | Collaboration management with budget tracking |
| Campaign creation & management | Earnings dashboard & payment tracking |
| Real-time social media analytics | Social media account connection & sync |
| PDF report downloads | Creator-focused AI reports |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│  Port 5173 → Proxy to :3000                                         │
│  React 18 · TypeScript · Tailwind CSS · Redux Toolkit · Recharts     │
└──────────────────────┬───────────────────────────────────────────────┘
                       │  HTTP (Axios → /v1/*)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (NestJS v11 + TypeORM)                  │
│  Port 3000                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐              │
│  │  AuthModule  │  │ CampaignsModule│ │  PaymentsModule│             │
│  │ JWT + Session│  │ CRUD + Status │ │  Razorpay/UPI  │             │
│  └─────────────┘  └──────────────┘  └────────────────┘              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐              │
│  │CreatorsModule│  │  BrandsModule │ │  SocialModule  │              │
│  │ Profiles     │  │  Brand CRUD  │ │  OAuth + Sync  │              │
│  └─────────────┘  └──────────────┘  └────────────────┘              │
│  ┌────────────────────────────────────────────────────┐              │
│  │            MatchingModule (AI Orchestrator)         │              │
│  │  MatchingService ← AIPythonService (→ Flask :5002) │              │
│  │                  ← AiMatchingService (→ FastAPI :5001)│           │
│  │  PdfGenerationService (jsPDF/PDFKit)               │              │
│  └────────────────────────────────────────────────────┘              │
│  ┌─────────────┐  ┌──────────────┐                                   │
│  │  AiModule   │  │AnalyticsModule│                                  │
│  │ ML API calls│  │ Dashboard data│                                  │
│  └─────────────┘  └──────────────┘                                   │
└────────────┬────────────────────────────┬────────────────────────────┘
             │                            │
             ▼                            ▼
┌────────────────────────┐   ┌────────────────────────────────────────┐
│  Python Flask API      │   │  Python FastAPI Inference Server       │
│  Port 5002             │   │  Port 5001                             │
│  ┌──────────────────┐  │   │  ┌──────────────────────────────────┐  │
│  │ AIPredictionSvc  │  │   │  │  LightweightEnsemble             │  │
│  │  ┌─────────────┐ │  │   │  │  ├── HybridSemanticMatcher       │  │
│  │  │MatchingML   │ │  │   │  │  │   (BERT + category + demo)    │  │
│  │  │ Model v2.0  │ │  │   │  │  ├── FeatureEngineer             │  │
│  │  │ ┌─────────┐ │ │  │   │  │  │   (50+ features)              │  │
│  │  │ │sklearn  │ │ │  │   │  │  └── Heuristic scoring           │  │
│  │  │ │ RF+GB   │ │ │  │   │  └──────────────────────────────────┘  │
│  │  │ ├─────────┤ │ │  │   │  Prometheus metrics + Redis cache      │
│  │  │ │India    │ │ │  │   └────────────────────────────────────────┘
│  │  │ │XGBoost  │ │ │  │
│  │  │ │R²=0.86  │ │ │  │
│  │  │ ├─────────┤ │ │  │
│  │  │ │India NN │ │ │  │
│  │  │ │MSE=0.40 │ │ │  │
│  │  │ └─────────┘ │ │  │
│  │  └─────────────┘ │  │
│  │  ┌─────────────┐ │  │
│  │  │ GeminiReport│ │  │
│  │  │ Generator   │ │  │
│  │  └─────────────┘ │  │
│  └──────────────────┘  │
└────────────────────────┘
             │
             ▼
┌────────────────────────┐   ┌──────────────────────────┐
│  Neon PostgreSQL       │   │  Redis Cloud             │
│  (Serverless)          │   │  (Sessions + Cache)      │
│  ep-morning-rain-*     │   │  redis-12525.*           │
│  10 core tables        │   │  Bull queues             │
│  2 SQL views           │   └──────────────────────────┘
│  5 migration files     │
└────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Component | Technology | Version |
|---|---|---|
| Framework | NestJS | v11 |
| Runtime | Node.js | v22 |
| ORM | TypeORM | Latest |
| Database | Neon PostgreSQL | Serverless |
| Cache/Queue | Redis Cloud + Bull | Latest |
| Auth | JWT + Session (dual) | @nestjs/jwt, @nestjs/passport |
| API Docs | Swagger/OpenAPI | @nestjs/swagger |
| PDF Generation | PDFKit + jsPDF | Latest |

### Frontend
| Component | Technology | Version |
|---|---|---|
| Framework | React | 18.2 |
| Language | TypeScript | Latest |
| Build Tool | Vite | 5.0 |
| Styling | Tailwind CSS | 3.3 |
| State | Redux Toolkit | 2.0 |
| HTTP | Axios | 1.6 |
| Charts | Recharts | 2.10 |
| Forms | React Hook Form + Zod | 7 |
| Routing | React Router DOM | 6.20 |
| Icons | Lucide React | Latest |

### AI/ML
| Component | Technology | Purpose |
|---|---|---|
| scikit-learn | RandomForest, GradientBoosting | Base match/ROI/engagement models |
| XGBoost | XGBRegressor | India-trained match scoring (R²=0.86) |
| PyTorch | 128→64→32→1 NN | India-trained neural matching (MSE=0.40) |
| SentenceTransformers | all-MiniLM-L6-v2 (BERT) | Semantic text similarity |
| Google Gemini | gemini-pro | Natural language reports, risk assessment |
| FAISS | Facebook AI Similarity Search | Fast vector retrieval (candidate gen) |
| Prometheus | prometheus-client | ML inference monitoring |

---

## 4. Complete User Flows

### 4.1 Brand User Flow

```
1. REGISTER → POST /v1/auth/register (role: brand_admin)
       ↓
2. LOGIN → POST /v1/auth/login → JWT + Session ID returned
       ↓
3. CREATE BRAND PROFILE → POST /v1/brands
       ↓
4. CREATE CAMPAIGN → POST /v1/campaigns
   (title, category, platform, budget, requirements, dates)
       ↓
5. VIEW AI-MATCHED CREATORS → GET /v1/matching/campaign/:id/creators
   ┌─────────────────────────────────────────────────────────┐
   │  Backend MatchingService.findMatchingCreators():         │
   │  1. Fetch all active+verified creators from DB           │
   │  2. Run rule-based analyzeMatch() for each               │
   │  3. Call getAIAnalysis() → combines ML + Gemini scores   │
   │  4. Sort by match score, return ranked list              │
   └─────────────────────────────────────────────────────────┘
       ↓
6. VIEW DETAILED CREATOR ANALYSIS → GET /v1/matching/campaign/:cId/creator/:crId/analysis
   ┌─────────────────────────────────────────────────────────┐
   │  getDetailedCreatorAnalysis():                           │
   │  1. Rule-based analysis (category, experience, rating)   │
   │  2. ML API call → FastAPI :5001 → ensemble prediction    │
   │  3. AI API call → Flask :5002 → Gemini report            │
   │  4. Merge scores, save to ai_analysis_reports table      │
   │  Returns: match score, ROI, audience overlap, budget fit,│
   │  strengths, concerns, AI summary, risk assessment        │
   └─────────────────────────────────────────────────────────┘
       ↓
7. DOWNLOAD PDF REPORT → GET /v1/matching/.../download-report
       ↓
8. SEND COLLABORATION REQUEST → POST /v1/matching/.../request
   (proposed_budget, message, deliverables, deadline)
       ↓
9. TRACK COLLABORATIONS → GET /v1/matching/campaign/:id/collaborations
       ↓
10. VIEW ANALYTICS → GET /v1/analytics/overview
```

### 4.2 Creator User Flow

```
1. REGISTER → POST /v1/auth/register (role: creator)
       ↓
2. LOGIN → POST /v1/auth/login
       ↓
3. COMPLETE PROFILE → PATCH /v1/creators/:id
   (bio, categories, languages, location, social_links)
       ↓
4. CONNECT SOCIAL MEDIA → POST /v1/social/connect
   (Instagram, YouTube, TikTok, Twitter via OAuth)
       ↓
5. VIEW RECOMMENDED CAMPAIGNS → GET /v1/matching/creator/:id/campaigns
   ┌─────────────────────────────────────────────────────────┐
   │  getRecommendedCampaigns():                              │
   │  1. Fetch all active campaigns                           │
   │  2. analyzeMatch() against creator profile               │
   │  3. Sort by match score, return ranked list              │
   └─────────────────────────────────────────────────────────┘
       ↓
6. VIEW COLLABORATION REQUESTS → GET /v1/creators/collaborations
       ↓
7. ACCEPT/REJECT → PATCH /v1/creators/collaborations/:id
       ↓
8. GENERATE AI REPORT → POST /v1/creators/collaborations/:id/generate-ai-report
   (Creator-focused Gemini report)
       ↓
9. TRACK EARNINGS → GET /v1/payments/earnings
       ↓
10. VIEW ANALYTICS → GET /v1/analytics/creator-analytics
```

### 4.3 AI Matching Flow (Detailed)

When a brand views creator matches for a campaign, this is the exact internal flow:

```
Frontend: GET /v1/matching/campaign/:id/creators
       ↓
NestJS MatchingController.findMatchingCreators()
       ↓
MatchingService.findMatchingCreators(campaignId)
  │
  ├── 1. Load campaign from DB
  ├── 2. Load all active+verified creators with user relation
  ├── 3. For EACH creator:
  │     │
  │     ├── a. analyzeMatch(creator, campaign)  [rule-based, in-process]
  │     │     ├── Category match: 30 points max
  │     │     ├── Requirements match: 25 points max
  │     │     ├── Experience level: 20 points max
  │     │     ├── Rating & reliability: 15 points max
  │     │     └── Platform match: 10 points max
  │     │
  │     └── b. getAIAnalysis(campaignId, creatorId)
  │           │
  │           ├── STEP 1: AiMatchingService → FastAPI :5001/predict
  │           │   ├── formatCreatorForML()  (UUID→int, social→arrays)
  │           │   ├── formatCampaignForML() (dates→duration, etc.)
  │           │   └── Response: {match_score: 0-1, confidence: 0-1}
  │           │
  │           ├── STEP 2: AIPythonService → Flask :5002/api/analyze
  │           │   ├── prepareCreatorData() / prepareCampaignData()
  │           │   └── Response: {match_score, ml_predictions,
  │           │         dl_predictions, strengths, concerns,
  │           │         audience_overlap, budget_fit, features}
  │           │
  │           │     Inside Flask :5002:
  │           │     └── AIPredictionService.get_comprehensive_analysis()
  │           │         ├── _extract_features() → 15 features
  │           │         ├── MatchingMLModel.predict() ← ENSEMBLE v2.0
  │           │         │   ├── sklearn RandomForest (match_score_model.pkl)
  │           │         │   ├── India XGBoost (india_xgboost_model.json) ★
  │           │         │   ├── India Neural Net (india_neural_network.pth) ★
  │           │         │   ├── sklearn GradientBoosting (roi_model.pkl)
  │           │         │   └── sklearn RandomForest (engagement_model.pkl)
  │           │         │   → Weighted average → ensemble score
  │           │         ├── DL predictions (from India NN or fallback)
  │           │         └── Generate strengths, concerns, reasons
  │           │
  │           └── STEP 3: Merge ML + AI predictions
  │                 ├── combined.ml_predictions.match_score = FastAPI * 100
  │                 ├── combined.dl_predictions from Flask ensemble
  │                 └── Save to ai_analysis_reports table
  │
  ├── 4. Sort all creators by matchScore (descending)
  ├── 5. Assign rank numbers (1, 2, 3, ...)
  └── 6. Return CreatorMatch[] to frontend
```

---

## 5. Backend (NestJS) — Full API Reference

### Authentication (`/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user (creator or brand_admin) |
| POST | `/auth/login` | Login → returns JWT + session ID |
| POST | `/auth/logout` | Logout current session |
| POST | `/auth/logout-all` | Logout all devices |
| GET | `/auth/profile` | Get current user profile |
| GET | `/auth/sessions` | List active sessions |
| DELETE | `/auth/sessions/:id` | Revoke a specific session |

### Campaigns (`/v1/campaigns`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/campaigns` | List all campaigns |
| GET | `/campaigns/active` | List active campaigns |
| GET | `/campaigns/my-campaigns` | List current user's campaigns |
| GET | `/campaigns/recommended` | AI-recommended for creator |
| GET | `/campaigns/:id` | Get campaign by ID |
| POST | `/campaigns` | Create new campaign |
| PATCH | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |

### Creators (`/v1/creators`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/creators` | Create creator profile |
| GET | `/creators` | List all creators |
| GET | `/creators/me` | Get own creator profile |
| GET | `/creators/profile/:id` | Get creator by ID |
| GET | `/creators/user/:userId` | Get creator by user ID |
| PATCH | `/creators/:id` | Update creator profile |
| DELETE | `/creators/:id` | Delete creator |
| GET | `/creators/collaborations` | List creator's collaborations |
| GET | `/creators/collaborations/:id` | Get collaboration detail |
| PATCH | `/creators/collaborations/:id` | Accept/reject collaboration |
| POST | `/creators/collaborations/:id/generate-ai-report` | Generate AI report |
| GET | `/creators/dashboard` | Creator dashboard data |

### Brands (`/v1/brands`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/brands` | Create brand profile |
| GET | `/brands` | List all brands |
| GET | `/brands/:id` | Get brand by ID |
| GET | `/brands/my-brand` | Get own brand |
| PATCH | `/brands/:id` | Update brand |
| DELETE | `/brands/:id` | Delete brand |

### AI/ML Matching (`/v1/matching`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/matching/campaign/:cId/creators` | **Find AI-matched creators** |
| GET | `/matching/campaign/:cId/creator/:crId/analysis` | **Detailed AI analysis** |
| GET | `/matching/campaign/:cId/creator/:crId/ai-analysis` | **Comprehensive AI report** |
| POST | `/matching/campaign/:cId/creator/:crId/request` | Send collaboration request |
| GET | `/matching/campaign/:cId/collaborations` | List campaign collaborations |
| GET | `/matching/creator/:crId/campaigns` | Recommended campaigns for creator |
| POST | `/matching/campaign/:cId/creator/:crId/generate-report` | Generate Gemini report |
| GET | `/matching/campaign/:cId/ai-reports` | All AI reports for campaign |
| GET | `/matching/campaign/:cId/creator/:crId/download-report` | Download PDF report |

### Direct AI API (`/v1/api/ai`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/match` | Direct ML match score |
| POST | `/api/ai/rank-creators` | Rank multiple creators |
| POST | `/api/ai/explain` | Explain a match |
| GET | `/api/ai/health` | ML API health check |

### Social Media (`/v1/social`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/social/accounts` | List connected accounts |
| POST | `/social/connect` | Connect social account |
| DELETE | `/social/accounts/:id` | Disconnect account |
| GET | `/social/accounts/:id/metrics` | Get account metrics |
| POST | `/social/accounts/:id/sync` | Trigger manual sync |
| GET | `/social/analytics/overview` | Social analytics overview |

### Analytics (`/v1/analytics`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/overview` | Dashboard overview |
| GET | `/analytics/campaign-performance` | Campaign performance |
| GET | `/analytics/ai-insights` | AI-powered insights |
| GET | `/analytics/creator-analytics` | Creator analytics |
| GET | `/analytics/social-metrics` | Social media metrics |
| GET | `/analytics/revenue` | Revenue analytics |

### Payments (`/v1/payments`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments` | Create payment |
| GET | `/payments` | List payments |
| GET | `/payments/:id` | Get payment detail |
| GET | `/payments/earnings` | Creator earnings summary |
| GET | `/payments/pending` | Pending payments |
| PATCH | `/payments/:id` | Update payment status |

---

## 6. AI/ML System — Models, Training & Inference

### 6.1 Model Architecture

The AI system uses a **5-model weighted ensemble** for match scoring:

```
                    ┌─────────────────────────────────────┐
                    │     Ensemble Prediction (v2.0)       │
                    │                                      │
Creator Features ──►│  ┌─────────────────┐                │
Campaign Features ──►│  │ sklearn RF      │ weight=0.25    │
                    │  │ match_score.pkl  │────────┐       │
                    │  └─────────────────┘        │       │
                    │  ┌─────────────────┐        │       │
                    │  │ India XGBoost   │ weight=0.35    │
                    │  │ R²=0.86         │────────┤       │
                    │  │ 15K IN creators │        │       │
                    │  └─────────────────┘        ├───► Weighted   ──► match_score
                    │  ┌─────────────────┐        │    Average        (0-100)
                    │  │ India NN        │ weight=0.20    │
                    │  │ MSE=0.40        │────────┤       │
                    │  │ 128→64→32→1     │        │       │
                    │  └─────────────────┘        │       │
                    │  ┌─────────────────┐        │       │
                    │  │ sklearn GB ROI  │ weight=0.10    │  ──► estimated_roi
                    │  │ roi_model.pkl   │────────┤       │       (0-300%)
                    │  └─────────────────┘        │       │
                    │  ┌─────────────────┐        │       │
                    │  │ sklearn RF Eng  │ weight=0.10    │  ──► estimated_engagement
                    │  │ engagement.pkl  │────────┘       │       (0-100%)
                    │  └─────────────────┘                │
                    └─────────────────────────────────────┘
```

### 6.2 Feature Set (15 Features)

The models use these 15 engineered features:

| # | Feature | Range | Description |
|---|---|---|---|
| 1 | `category_match` | 0-1 | 1.0 if campaign category ∈ creator categories |
| 2 | `followers_match` | 0.5-1 | 1.0 if creator meets min_followers requirement |
| 3 | `engagement_match` | 0.5-1 | 1.0 if creator meets min_engagement requirement |
| 4 | `platform_match` | 0.8 | Platform alignment score |
| 5 | `experience_score` | 1-5 | Based on total_campaigns (1 per 10 campaigns) |
| 6 | `overall_rating` | 0-5 | Creator's average rating from past collaborations |
| 7 | `num_categories` | 1+ | Number of creator's content categories |
| 8 | `num_languages` | 1+ | Number of languages creator produces content in |
| 9 | `estimated_followers` | 0+ | Total estimated followers across platforms |
| 10 | `estimated_engagement_rate` | 0-1 | Average engagement rate |
| 11 | `campaign_budget` | 0+ | Campaign budget (INR) |
| 12 | `campaign_duration_days` | 1+ | Campaign duration in days |
| 13 | `budget_fit` | 0-2 | budget / estimated_creator_cost ratio |
| 14 | `versatility_score` | 0+ | num_categories × num_languages × 0.1 |
| 15 | `success_rate` | 0-1 | overall_rating / 5.0 |

### 6.3 Training Data

| Dataset | Creators | Campaigns | Interactions | Features |
|---|---|---|---|---|
| **India Dataset** | 15,000 | 7,000 | 150,000 | 32 |
| **Global Dataset** | Available | Available | Available | 15 |

### 6.4 Model Performance

| Model | Type | Train Metric | Test Metric | Status |
|---|---|---|---|---|
| **India XGBoost** | XGBRegressor (100 trees, depth 6) | R²=0.91 | **R²=0.86** | ✅ **NOW ACTIVE** |
| **India Neural Network** | PyTorch (128→64→32→1) | MSE=0.41 | **MSE=0.40** | ✅ **NOW ACTIVE** |
| sklearn RandomForest (Match) | RF (200 trees, depth 15) | — | — | ✅ Active |
| sklearn GradientBoosting (ROI) | GB (150 trees, depth 8) | — | — | ✅ Active |
| sklearn RandomForest (Engagement) | RF (100 trees, depth 10) | — | — | ✅ Active |

### 6.5 Inference Pipeline

**Port 5002 — Flask API (Primary for backend)**:
```
POST /api/analyze
  → AIPredictionService.get_comprehensive_analysis()
    → _extract_features() → 15-feature dict
    → MatchingMLModel.predict() → ENSEMBLE of 5 models
    → DL predictions from India NN
    → Generate strengths, concerns, reasons
    → Return comprehensive analysis JSON
```

**Port 5001 — FastAPI (Secondary, semantic matching)**:
```
POST /predict
  → LightweightEnsemble.predict()
    → HybridSemanticMatcher (BERT text similarity)
    → FeatureEngineer (interaction features)
    → Combined score (40% semantic + 30% requirements + 15% experience + 15% quality)
```

### 6.6 Gemini AI Integration

The system uses **Google Gemini Pro** for:

| Feature | Method | Description |
|---|---|---|
| **Comprehensive Report** | `generate_comprehensive_report()` | Full multi-page analysis |
| **Quick Summary** | `generate_quick_summary()` | 2-3 sentence overview |
| **Recommendations** | `generate_recommendations()` | Actionable steps list |
| **Risk Assessment** | `generate_risk_assessment()` | Risk level + factors + mitigations |
| **Creator-Focused Report** | `generate_creator_focused_report()` | Report from creator's perspective |
| **Creator Quick Insights** | `generate_creator_quick_insights()` | Quick creator-side summary |

**API Key**: Configured via `GEMINI_API_KEY` environment variable.

### 6.7 Model Files Inventory

```
ai/models/
├── match_score_model.pkl          # sklearn RandomForest (match scoring)
├── roi_model.pkl                  # sklearn GradientBoosting (ROI prediction)
├── engagement_model.pkl           # sklearn RandomForest (engagement prediction)
├── scaler.pkl                     # sklearn StandardScaler (feature normalization)
├── feature_names.json             # Ordered list of 15 feature names
├── india_xgboost_model.json       # ★ India-trained XGBoost (R²=0.86)
├── india_neural_network.pth       # ★ India-trained PyTorch NN (MSE=0.40)
├── india_training_report.json     # Training metrics and data stats
└── saved/                         # (empty) — for Two-Tower/NCF if trained
```

---

## 7. Frontend (React) — Pages & Components

### 7.1 Route Structure

| Route | Page | Role |
|---|---|---|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Auto-routes to role-specific dashboard | Auth |
| `/creator/dashboard` | Creator Dashboard | Creator |
| `/creator/profile` | Creator Profile Editor | Creator |
| `/creator/campaigns` | Creator's Campaigns | Creator |
| `/creator/analytics` | Creator Analytics | Creator |
| `/creator/earnings` | Earnings & Payments | Creator |
| `/creator/social` | Social Media Connections | Creator |
| `/creator/collaborations` | Collaboration Requests | Creator |
| `/creator/collaborations/:id` | Collaboration Detail | Creator |
| `/creator/recommended` | AI-Recommended Campaigns | Creator |
| `/brand/dashboard` | Brand Dashboard | Brand Admin |
| `/brand/campaigns` | Brand's Campaigns | Brand Admin |
| `/brand/campaigns/new` | Create Campaign | Brand Admin |
| `/brand/campaigns/:id/matching` | **AI Creator Matching** ⭐ | Brand Admin |
| `/brand/campaigns/:id/analysis/:creatorId` | **Detailed AI Analysis** ⭐ | Brand Admin |
| `/brand/campaigns/:id/collaborations` | Campaign Collaborations | Brand Admin |
| `/brand/discover` | Discover Creators | Brand Admin |
| `/brand/analytics` | Brand Analytics | Brand Admin |
| `/campaign/:id` | Campaign Detail | Auth |

### 7.2 AI-Powered Pages (Key Features)

#### CreatorMatching Page (`/brand/campaigns/:id/matching`)
- Calls `GET /v1/matching/campaign/:id/creators`
- Displays ranked creator cards with:
  - Match score (color-coded: ≥80 green, ≥60 blue, ≥40 yellow, <40 gray)
  - Key strengths & concerns from AI analysis
  - Estimated ROI and audience overlap percentages
  - Creator info (name, bio, location, categories, rating)
  - "View Details" button → navigates to detailed analysis

#### CreatorAnalysis Page (`/brand/campaigns/:id/analysis/:creatorId`)
- Calls `GET /v1/matching/campaign/:cId/creator/:crId/analysis`
- Displays:
  - **Match Score Card** — large score with confidence level
  - **4 Key Metrics**: Est. ROI, Audience Match, Experience Level, Budget Fit
  - **AI Predictions Section** (from ML models):
    - ML Match Score (from ensemble — RandomForest + India XGBoost + India NN)
    - Estimated ROI (GradientBoosting)
    - Success Probability (India Neural Network)
    - Predicted Engagement, Audience Overlap, DL Match Score
  - **Risk Assessment**: risk level, risk factors, mitigation strategies
  - **AI Summary**: free-text paragraph from Gemini
  - **AI Recommendations**: numbered list from Gemini
  - **Download AI Report**: PDF generation
  - **Send Collaboration Request** modal

#### RecommendedCampaigns Page (`/creator/recommended`)
- Calls `GET /v1/matching/creator/:id/campaigns`
- Shows campaigns scored and ranked by AI for the creator

### 7.3 State Management (Redux)

| Slice | Purpose |
|---|---|
| `authSlice` | User authentication, JWT, profile |
| `campaignsSlice` | Campaign CRUD operations |
| `creatorsSlice` | Creator profiles and data |
| `brandsSlice` | Brand profiles and data |
| `socialSlice` | Social media accounts and metrics |
| `paymentsSlice` | Payments and earnings |

### 7.4 API Client Configuration

- **Base URL**: `/v1` (proxied by Vite to `http://localhost:3000`)
- **Auth**: Dual — `x-session-id` + `Authorization: Bearer <JWT>`
- **Interceptors**: Auto-attach auth headers, auto-logout on 401

---

## 8. Database Schema

### Core Tables (Neon PostgreSQL)

| Table | Purpose | Key Columns |
|---|---|---|
| `tenants` | Multi-tenant orgs | id, name, type, domain, subscription_tier |
| `users` | Authentication | id, tenant_id, email, password_hash, role, status |
| `creators` | Creator profiles | id, user_id, name, bio, categories, languages, kyc_status |
| `brands` | Brand profiles | id, tenant_id, name, industry, website |
| `campaigns` | Marketing campaigns | id, brand_id, title, category, platform, budget, status |
| `collaborations` | Brand-creator requests | id, campaign_id, creator_id, status, proposed_budget |
| `social_accounts` | Connected social media | id, creator_id, platform, username, followers, access_token |
| `social_metrics_history` | Metrics over time | id, social_account_id, recorded_at, metrics |
| `ai_analysis_reports` | AI scoring results | id, campaign_id, creator_id, match_score, ml_match_score, strengths |
| `payments` | Payment records | id, offer_id, amount, status, provider_txn_id |

### Additional Tables (from migrations)
| Table | Purpose |
|---|---|
| `posts` | Social media posts with engagement metrics |
| `campaign_offers` | Formal campaign offers with state machine |
| `match_scores` | Cached match scores with model versions |
| `audit_logs` | System audit trail |
| `invoices` | Financial invoices |
| `oauth_states` | OAuth flow state management |
| `sync_jobs` | Social media sync job tracking |
| `metrics_history` | Post-level metrics over time |

### SQL Views
| View | Purpose |
|---|---|
| `creator_performance_summary` | Aggregated creator metrics (joined posts, accounts, offers) |
| `campaign_performance` | Campaign performance metrics |

### Migrations
```
migrations/
├── 001_initial_schema.sql          # All core tables, indexes, views, functions
├── 002_create_collaborations.sql   # Collaborations table
├── 004_update_ai_reports_uuid.sql  # AI reports with UUID keys
└── 005_social_media_api_integration.sql  # Social OAuth columns
```

---

## 9. ML Model Inventory & Integration Status

### ✅ ACTIVE — Used in Production Predictions

| Model | File | Loaded By | Called Via | Weight |
|---|---|---|---|---|
| sklearn RandomForest (Match) | `match_score_model.pkl` | `ml_matching.py` | Flask :5002 | 25% |
| sklearn GradientBoosting (ROI) | `roi_model.pkl` | `ml_matching.py` | Flask :5002 | 10% |
| sklearn RandomForest (Engagement) | `engagement_model.pkl` | `ml_matching.py` | Flask :5002 | 10% |
| **India XGBoost** ★ | `india_xgboost_model.json` | `ml_matching.py` | Flask :5002 | **35%** |
| **India Neural Network** ★ | `india_neural_network.pth` | `ml_matching.py` | Flask :5002 | **20%** |
| HybridSemanticMatcher (BERT) | HuggingFace download | `ensemble.py` | FastAPI :5001 | 40% of semantic |
| Google Gemini Pro | Cloud API | `gemini_report.py` | Flask :5002 | Reports only |

### ⚠️ BUILT BUT NOT IN MAIN PIPELINE

| Model | File | Reason |
|---|---|---|
| Two-Tower DNN | `ml_models/two_tower.py` | Never trained — `models/saved/` empty |
| Neural Collaborative Filtering | `ml_models/ncf.py` | Never trained — no model weights |
| Full EnsemblePredictor | `inference/ensemble.py` | Only uses LightweightEnsemble |
| v2 RecommendationEngine | `core/recommendation_engine.py` | No backend endpoint calls it |
| LightGBM Ranking Model | `core/ranking.py` | No trained model file |
| FAISS Index | `core/embeddings.py` | Not built (no creator data loaded) |

### 📊 What Changed (v1.0 → v2.0)

**Before (v1.0)**:
- Only 3 sklearn models (RF match + GB ROI + RF engagement)
- India XGBoost (R²=0.86) and India NN (MSE=0.40) existed but were **dead artifacts**
- No ensemble — single model predictions

**After (v2.0 — Current)**:
- **5-model weighted ensemble** in `ml_matching.py`
- India XGBoost gets highest weight (35%) due to superior R² on India market data
- India Neural Network adds deep learning signal (20%)
- sklearn models remain as stabilizers (25% + 10% + 10%)
- `dl_predictions` now uses real India NN output instead of computed fallback
- Health endpoint reports all loaded models

---

## 10. Deployment Architecture

### Services to Run

| Service | Command | Port | Directory |
|---|---|---|---|
| **NestJS Backend** | `npm run start:dev` | 3000 | `backend/` |
| **React Frontend** | `npm run dev` | 5173 | `frontend/` |
| **FastAPI ML API** | `uvicorn inference.api_server:app --port 5001` | 5001 | `ai/` |
| **Flask AI API** | `python api_server.py 5002` | 5002 | `ai/` |

### External Services

| Service | Provider | Purpose |
|---|---|---|
| PostgreSQL | Neon (Serverless) | Primary database |
| Redis | Redis Cloud | Sessions, caching, Bull queues |
| Gemini AI | Google Cloud | Report generation |

### Docker Support
```
docker-compose.yml          # Development
docker-compose.prod.yml     # Production
ai/Dockerfile               # AI service container
backend/ (Dockerfile)       # NestJS container
frontend/Dockerfile         # React build + Nginx
```

---

## 11. Environment Variables Reference

### Backend (`backend/.env`)
```bash
# Database (Neon PostgreSQL)
DATABASE_HOST=ep-morning-rain-*.neon.tech
DATABASE_PORT=5432
DATABASE_USER=neondb_owner
DATABASE_PASSWORD=npg_***
DATABASE_NAME=neondb
DATABASE_URL=postgresql://neondb_owner:***@ep-morning-rain-*.neon.tech/neondb?sslmode=require

# Redis
REDIS_HOST=redis-12525.*.redislabs.com
REDIS_PORT=12525
REDIS_PASSWORD=***

# Auth
JWT_SECRET=***
SESSION_SECRET=***

# AI Services
ML_API_URL=http://localhost:5001    # FastAPI inference server
AI_SERVICE_URL=http://localhost:5002 # Flask analysis server

# Server
PORT=3000
NODE_ENV=development
```

### AI Service (`ai/.env`)
```bash
GEMINI_API_KEY=AIzaSy***
```

### Frontend (`frontend/.env.example`)
```bash
VITE_API_URL=http://localhost:3000
```

---

## 12. Known Issues & Fixes Applied

### Fixed Issues

| Issue | Root Cause | Fix |
|---|---|---|
| `ENOTFOUND ep-morning-rain-*` | Corporate DNS blocking cloud hostnames | Custom DNS resolver in `app.module.ts` using Google DNS (8.8.8.8) fallback |
| TypeORM sync destroying schema | `synchronize: true` + entity-migration mismatch | Set `synchronize: false` — schema managed by SQL migrations |
| Redis WRONGPASS | Wrong password for redis-12525 | Made Redis non-fatal — app continues without it |
| Stale `dist/` build | VS Code caching + incremental build | Clean rebuild with `rm dist/ && npm run build` |
| Migration UUID type mismatch | FK column types didn't match | Fixed migrations 004 and 005 |
| India models not used | `india_xgboost_model.json` and `india_neural_network.pth` existed but nothing loaded them | **Integrated into `ml_matching.py` ensemble** |

### Current Known Issues

| Issue | Impact | Workaround |
|---|---|---|
| Redis password wrong | Sessions/caching unavailable | App continues without Redis |
| Two-Tower model untrained | Full EnsemblePredictor falls back to LightweightEnsemble | Uses semantic + heuristic scoring |
| Creator entity ≠ migration schema | TypeORM entities have fewer columns than DB | `synchronize: false` prevents destructive sync |
| `dl_analysis_model.h5` missing | DL Analysis class can't load Keras model | India NN provides DL predictions instead |

---

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../ai && pip install -r requirements.txt

# 2. Start all services
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend  
cd frontend && npm run dev

# Terminal 3 — Flask AI API (port 5002)
cd ai && python api_server.py 5002

# Terminal 4 — FastAPI ML API (port 5001)
cd ai && uvicorn inference.api_server:app --host 0.0.0.0 --port 5001

# 3. Open browser
# http://localhost:5173
```

---

*Generated from full codebase audit of 50+ source files across backend/, frontend/, and ai/ directories.*
