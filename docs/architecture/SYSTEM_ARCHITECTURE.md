# SafarCollab - System Architecture

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Infrastructure Architecture](#infrastructure-architecture)
5. [Security Architecture](#security-architecture)
6. [Scalability Considerations](#scalability-considerations)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Creators │  │  Brands  │  │  Admins  │  │   APIs   │       │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└────────┼────────────┼──────────────┼─────────────┼──────────────┘
         │            │              │             │
         └────────────┼──────────────┼─────────────┘
                      │              │
         ┌────────────▼──────────────▼─────────────┐
         │         LOAD BALANCER (ALB)             │
         └────────────┬──────────────┬─────────────┘
                      │              │
        ┌─────────────▼──────┐  ┌───▼──────────────┐
        │  FRONTEND (React)  │  │  BACKEND (API)   │
        │  - Static Assets   │  │  - NestJS        │
        │  - CloudFront CDN  │  │  - Business Logic│
        └────────────────────┘  └───┬──────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────┐
         │                          │                      │
    ┌────▼─────┐         ┌─────────▼────────┐    ┌───────▼──────┐
    │PostgreSQL│         │  Redis/RabbitMQ  │    │   Services   │
    │ Database │         │  Cache & Queues  │    │  - OAuth     │
    └────┬─────┘         └─────────┬────────┘    │  - Payment   │
         │                          │             │  - Matching  │
         │                          │             └───────┬──────┘
         │              ┌───────────▼──────────┐         │
         │              │   Background Jobs    │         │
         │              │  - Data Sync Workers │         │
         │              │  - ML Scoring Jobs   │         │
         │              └──────────────────────┘         │
         │                                               │
    ┌────▼───────────────────────────────────────────────▼──────┐
    │                  EXTERNAL SERVICES                         │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
    │  │Instagram │  │ YouTube  │  │  TikTok  │  │  Payment │ │
    │  │   API    │  │   API    │  │   API    │  │ Provider │ │
    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
    └─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend (React + Vite)

```
frontend/
├── src/
│   ├── pages/                 # Page components
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Signup.tsx
│   │   ├── creator/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── SocialConnect.tsx
│   │   │   ├── Campaigns.tsx
│   │   │   └── Earnings.tsx
│   │   └── brand/
│   │       ├── Dashboard.tsx
│   │       ├── CreateCampaign.tsx
│   │       ├── Discover.tsx
│   │       └── Analytics.tsx
│   ├── components/            # Reusable components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/               # UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   └── features/         # Feature components
│   │       ├── PostCard.tsx
│   │       ├── CampaignCard.tsx
│   │       ├── OfferCard.tsx
│   │       └── MatchScore.tsx
│   ├── features/             # Feature modules
│   │   ├── auth/
│   │   │   ├── authSlice.ts
│   │   │   └── authAPI.ts
│   │   ├── campaigns/
│   │   │   ├── campaignsSlice.ts
│   │   │   └── campaignsAPI.ts
│   │   └── creators/
│   │       ├── creatorsSlice.ts
│   │       └── creatorsAPI.ts
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useDebounce.ts
│   │   └── useInfiniteScroll.ts
│   ├── api/                  # API client
│   │   ├── axios.config.ts
│   │   └── endpoints.ts
│   ├── utils/                # Utilities
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── constants.ts
│   └── store/                # Redux store
│       └── index.ts
```

**Key Technologies:**
- **React 18**: Component framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Redux Toolkit**: State management
- **React Query**: Server state management
- **TailwindCSS**: Styling
- **Recharts**: Data visualization
- **React Hook Form**: Form handling
- **Zod**: Validation

---

### Backend (NestJS)

```
backend/
├── src/
│   ├── auth/                    # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── decorators/
│   │       └── current-user.decorator.ts
│   ├── creators/                # Creator management
│   │   ├── creators.controller.ts
│   │   ├── creators.service.ts
│   │   ├── entities/
│   │   │   └── creator.entity.ts
│   │   └── dto/
│   │       ├── create-creator.dto.ts
│   │       └── update-creator.dto.ts
│   ├── brands/                  # Brand management
│   ├── campaigns/               # Campaign lifecycle
│   │   ├── campaigns.controller.ts
│   │   ├── campaigns.service.ts
│   │   ├── entities/
│   │   │   ├── campaign.entity.ts
│   │   │   └── campaign-offer.entity.ts
│   │   └── dto/
│   ├── social/                  # Social media integration
│   │   ├── social.controller.ts
│   │   ├── social.service.ts
│   │   ├── adapters/
│   │   │   ├── instagram.adapter.ts
│   │   │   ├── youtube.adapter.ts
│   │   │   └── tiktok.adapter.ts
│   │   ├── entities/
│   │   │   ├── social-account.entity.ts
│   │   │   └── post.entity.ts
│   │   └── jobs/
│   │       ├── sync.processor.ts
│   │       └── metrics.processor.ts
│   ├── matching/                # Match & scoring engine
│   │   ├── matching.service.ts
│   │   ├── scoring/
│   │   │   ├── rule-based-scorer.ts
│   │   │   ├── ml-scorer.ts (future)
│   │   │   └── audience-analyzer.ts
│   │   └── entities/
│   │       └── match-score.entity.ts
│   ├── payments/                # Payment processing
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   ├── providers/
│   │   │   ├── razorpay.provider.ts
│   │   │   └── stripe.provider.ts
│   │   ├── entities/
│   │   │   ├── payment.entity.ts
│   │   │   └── invoice.entity.ts
│   │   └── jobs/
│   │       └── payout.processor.ts
│   ├── compliance/              # KYC & compliance
│   │   ├── compliance.service.ts
│   │   ├── kyc.service.ts
│   │   └── invoice-generator.service.ts
│   ├── analytics/               # Metrics & reporting
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── aggregators/
│   ├── admin/                   # Admin functionality
│   │   ├── admin.controller.ts
│   │   └── admin.service.ts
│   └── common/                  # Shared utilities
│       ├── database/
│       │   └── typeorm.config.ts
│       ├── decorators/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── logging.interceptor.ts
│       ├── pipes/
│       │   └── validation.pipe.ts
│       └── utils/
│           ├── encryption.util.ts
│           ├── pagination.util.ts
│           └── file-upload.util.ts
```

**Key Technologies:**
- **NestJS**: Backend framework
- **TypeORM**: ORM for PostgreSQL
- **Bull**: Job queue (Redis-based)
- **Passport**: Authentication
- **class-validator**: DTO validation
- **Axios**: HTTP client
- **AWS SDK**: S3, KMS integration
- **Winston**: Logging

---

## Data Flow

### 1. Creator Onboarding Flow

```
┌───────────┐      ┌──────────┐      ┌────────────┐      ┌──────────┐
│  Creator  │─────>│ Frontend │─────>│   Backend  │─────>│ Database │
│  Browser  │<─────│  (React) │<─────│  (NestJS)  │<─────│(Postgres)│
└───────────┘      └──────────┘      └─────┬──────┘      └──────────┘
                                            │
                    ┌───────────────────────┼───────────────┐
                    │                       │               │
               ┌────▼─────┐          ┌─────▼────┐    ┌────▼────┐
               │Instagram │          │ YouTube  │    │   S3    │
               │   API    │          │   API    │    │(Profile │
               └──────────┘          └──────────┘    │ Images) │
                                                     └─────────┘
```

**Steps:**
1. User fills profile form
2. Frontend validates and sends to backend
3. Backend saves to database
4. User initiates OAuth for social platforms
5. Backend redirects to platform OAuth
6. Platform returns authorization code
7. Backend exchanges code for access token
8. Backend encrypts and stores token
9. Background job queued for initial sync
10. Worker fetches posts and metrics
11. Data normalized and stored

---

### 2. Campaign Matching Flow

```
┌───────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐
│ Brand │────>│ Creates  │────>│  Matching  │────>│  Match   │
│       │     │ Campaign │     │   Engine   │     │  Scores  │
└───────┘     └──────────┘     └──────┬─────┘     └──────────┘
                                      │
                                      │ Calculates
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
              ┌────▼────┐       ┌────▼────┐      ┌─────▼──────┐
              │Audience │       │  Post   │      │  Content   │
              │  Data   │       │ Metrics │      │ Categories │
              └─────────┘       └─────────┘      └────────────┘

Scoring Formula (MVP):
total_score = 0.4 * audience_fit 
            + 0.25 * engagement_score 
            + 0.2 * content_fit 
            + 0.15 * authenticity_score
```

---

### 3. Payment Escrow Flow

```
                    ┌─────────────────────────────────┐
                    │     Payment Lifecycle           │
                    └─────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼─────┐              ┌────▼─────┐              ┌────▼─────┐
   │  Brand   │              │  Escrow  │              │ Creator  │
   │ Deposits │─────────────>│   Held   │─────────────>│  Payout  │
   └──────────┘              └──────────┘              └──────────┘
        │                          │                          │
        │ Razorpay/Stripe          │ Content Verified         │ Payout API
        │                          │                          │
   ┌────▼─────┐              ┌────▼─────┐              ┌────▼─────┐
   │ Payment  │              │ Platform │              │ Creator  │
   │ Provider │              │   Fee    │              │  Account │
   └──────────┘              │(12% default)           └──────────┘
                             └──────────┘

States: pending → processing → held → released → completed
```

---

## Infrastructure Architecture

### Production Deployment (AWS)

```
┌───────────────────────────────────────────────────────────────┐
│                        AWS CLOUD                               │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Route 53 (DNS)                             │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │         CloudFront CDN (Frontend Assets)                │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │  Application Load Balancer (ALB)                        │  │
│  │  - SSL Termination                                      │  │
│  │  - Health Checks                                        │  │
│  └─────────┬───────────────────────────────────┬───────────┘  │
│            │                                   │               │
│  ┌─────────▼──────────┐          ┌────────────▼───────────┐  │
│  │   ECS Cluster      │          │   ECS Cluster          │  │
│  │   (Backend API)    │          │   (Workers)            │  │
│  │   - Auto Scaling   │          │   - Sync Jobs          │  │
│  │   - Multiple AZs   │          │   - ML Scoring         │  │
│  └─────────┬──────────┘          └────────────┬───────────┘  │
│            │                                   │               │
│  ┌─────────▼──────────────────────────────────▼───────────┐  │
│  │                    VPC                                  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Private Subnets                                 │  │  │
│  │  │  ┌──────────────┐      ┌────────────────────┐   │  │  │
│  │  │  │ RDS Postgres │      │  ElastiCache Redis │   │  │  │
│  │  │  │  Multi-AZ    │      │   Cluster Mode     │   │  │  │
│  │  │  └──────────────┘      └────────────────────┘   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │      S3      │  │     KMS      │  │  Secrets Manager │    │
│  │ (File Store) │  │ (Encryption) │  │  (API Keys)      │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  CloudWatch  │  │   X-Ray      │  │      SQS         │    │
│  │  (Logging)   │  │  (Tracing)   │  │  (Message Queue) │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### Resource Specifications (Production)

#### Compute
- **Backend API**: ECS Fargate
  - 2 vCPU, 4GB RAM per task
  - Min: 2 tasks, Max: 20 tasks (auto-scaling)
  
- **Worker Nodes**: ECS Fargate
  - 4 vCPU, 8GB RAM per task
  - Min: 1 task, Max: 10 tasks

#### Database
- **RDS PostgreSQL 15**
  - Instance: db.t3.large (2 vCPU, 8GB RAM)
  - Storage: 100GB GP3 SSD (auto-scaling to 500GB)
  - Multi-AZ deployment
  - Automated backups (7-day retention)

#### Cache & Queue
- **ElastiCache Redis**
  - Node: cache.t3.medium
  - Cluster mode: 3 shards, 1 replica each

- **SQS**: Standard queues for async jobs

#### Storage
- **S3 Buckets**:
  - `influencia-uploads-prod`: User uploads
  - `influencia-raw-data-prod`: Raw social media JSON
  - Lifecycle policies: archive to Glacier after 90 days

---

## Security Architecture

### Authentication & Authorization

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Login Request
     │ (email + password)
     ▼
┌────────────┐
│   Backend  │
│  - Verify  │
│  password  │
└────┬───────┘
     │ 2. Generate JWT
     │
     ▼
┌────────────────────────────────┐
│         JWT Token              │
│  Header: { alg, typ }          │
│  Payload: {                    │
│    sub: user_id,               │
│    email: user@example.com,    │
│    role: 'creator',            │
│    tenant_id: uuid,            │
│    iat: timestamp,             │
│    exp: timestamp + 7d         │
│  }                             │
│  Signature: HMACSHA256(...)    │
└────────────────────────────────┘
     │
     │ 3. Return to client
     │ 4. Store in httpOnly cookie
     │    or localStorage (with XSS protection)
     ▼
┌────────────┐
│  Client    │
│  Stores    │
│  Token     │
└────┬───────┘
     │ 5. Subsequent requests
     │ Authorization: Bearer <token>
     ▼
┌────────────┐
│   Backend  │
│  - Verify  │
│  signature │
│  - Check   │
│  expiry    │
│  - Extract │
│  user info │
└────────────┘
```

### Data Encryption

**At Rest:**
- Database: AWS RDS encryption with KMS
- S3 objects: Server-side encryption (SSE-S3)
- Secrets: AWS Secrets Manager

**In Transit:**
- TLS 1.3 for all HTTPS traffic
- SSL connections to database
- Encrypted Redis connections

**Token Encryption:**
```typescript
// OAuth tokens stored encrypted
const encrypt = async (plaintext: string): Promise<string> => {
  const kms = new AWS.KMS();
  const result = await kms.encrypt({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: plaintext
  }).promise();
  return result.CiphertextBlob.toString('base64');
};
```

### Security Best Practices

1. **Input Validation**: All DTOs validated with class-validator
2. **SQL Injection Prevention**: TypeORM parameterized queries
3. **XSS Protection**: React auto-escapes, CSP headers
4. **CSRF Protection**: State parameter in OAuth flows
5. **Rate Limiting**: API endpoints rate-limited (100 req/min)
6. **Password Policy**: Min 8 chars, complexity requirements
7. **Secrets Rotation**: 90-day rotation for API keys
8. **Audit Logging**: All critical actions logged
9. **Least Privilege**: IAM roles with minimal permissions
10. **HTTPS Only**: Strict-Transport-Security header

---

## Scalability Considerations

### Horizontal Scaling

**Application Layer:**
- Stateless backend API (scales horizontally via ECS)
- Session state in Redis (shared across instances)
- File uploads directly to S3 (no local storage)

**Database Layer:**
- Read replicas for analytics queries
- Connection pooling (PgBouncer)
- Partitioning for large tables (metrics_history)

**Queue Processing:**
- Multiple worker instances process jobs in parallel
- Priority queues for time-sensitive jobs
- Dead letter queues for failed jobs

### Caching Strategy

**Levels:**
1. **CDN Cache** (CloudFront): Static assets, 1 year TTL
2. **Application Cache** (Redis): 
   - User sessions: 7 days
   - Match scores: 24 hours
   - Creator profiles: 1 hour
3. **Database Query Cache**: Frequently accessed aggregations

**Cache Invalidation:**
- Time-based expiry
- Event-based invalidation on updates
- Cache warming for popular data

### Performance Optimizations

**Database:**
- Indexes on all foreign keys and frequently queried fields
- Materialized views for complex aggregations
- Query optimization with EXPLAIN ANALYZE

**API:**
- Pagination for list endpoints (default: 20 items)
- Field selection (GraphQL-style for future)
- Response compression (gzip)
- ETags for conditional requests

**Background Jobs:**
- Batch processing for data sync
- Exponential backoff for retries
- Job prioritization (user-triggered > scheduled)

### Monitoring Metrics

**Application Metrics:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections

**Business Metrics:**
- User signups per day
- Social accounts connected
- Campaigns created
- Offers sent/accepted
- GMV (Gross Merchandise Value)

**Infrastructure Metrics:**
- CPU utilization
- Memory usage
- Database connections
- Queue depth
- Cache hit rate

---

## Disaster Recovery

### Backup Strategy
- **Database**: Automated daily snapshots, 7-day retention
- **S3**: Versioning enabled, cross-region replication
- **Application**: Infrastructure as Code (Terraform)

### RTO & RPO
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

### Failover Plan
1. DNS failover to backup region
2. Restore RDS from latest snapshot
3. Deploy application from latest Docker images
4. Verify system health
5. Resume operations

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Owner:** Platform Engineering Team
