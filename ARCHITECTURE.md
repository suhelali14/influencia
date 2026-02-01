# Influencia Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                     (https://yourdomain.com)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND SERVICE                           │
│                  (React + Vite + Nginx)                         │
│                        Port: 80/443                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  - Landing Page                                           │ │
│  │  - Brand Dashboard                                        │ │
│  │  - Creator Dashboard                                      │ │
│  │  - Campaign Management                                    │ │
│  │  - Analytics & Reports                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ API Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICE                            │
│                     (NestJS + Node.js)                          │
│                        Port: 3000                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  REST API Endpoints:                                      │ │
│  │  - /v1/auth/*          (Authentication)                   │ │
│  │  - /v1/campaigns/*     (Campaign CRUD)                    │ │
│  │  - /v1/creators/*      (Creator profiles)                 │ │
│  │  - /v1/matches/*       (Matching system)                  │ │
│  │  - /v1/analytics/*     (Analytics data)                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────┬─────────────────────────┬─────────────────────────┬───────┘
      │                         │                         │
      │ Store/Query             │ AI Processing           │ Cache
      ▼                         ▼                         ▼
┌─────────────────┐   ┌──────────────────────┐   ┌────────────────┐
│   PostgreSQL    │   │    AI SERVICE        │   │     REDIS      │
│   Database      │   │  (Python + Flask)    │   │   Cache Store  │
│                 │   │    Port: 5001        │   │   Port: 6379   │
│  ┌───────────┐  │   │  ┌───────────────┐  │   │  ┌──────────┐  │
│  │ Users     │  │   │  │ ML Matching   │  │   │  │ Sessions │  │
│  │ Campaigns │  │   │  │ Score Calc    │  │   │  │ Cache    │  │
│  │ Creators  │  │   │  │ Gemini AI     │  │   │  │ Queue    │  │
│  │ Matches   │  │   │  │ Analytics     │  │   │  └──────────┘  │
│  │ Analytics │  │   │  │ Predictions   │  │   │                │
│  └───────────┘  │   │  └───────────────┘  │   └────────────────┘
│                 │   │                      │
│  Neon.tech or   │   │  Includes:          │   Upstash or
│  Supabase       │   │  - scikit-learn     │   Redis Cloud
│                 │   │  - TensorFlow       │
└─────────────────┘   │  - Gemini API       │
                      │  - NumPy/Pandas     │
                      └──────────────────────┘
```

---

## Deployment Flow

### Cloud Platform (Railway/Render)

```
┌──────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│                (Your Influencia Source Code)                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ Auto-deploy on push
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   Cloud Platform (Railway)                   │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │   Frontend     │  │    Backend     │  │   AI Service   ││
│  │   Container    │  │   Container    │  │   Container    ││
│  │                │  │                │  │                ││
│  │  Build & Run   │  │  Build & Run   │  │  Build & Run   ││
│  │  Nginx         │  │  Node.js       │  │  Python        ││
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘│
│           │                   │                   │         │
│           │  https://app      │  https://api      │  https://ai │
│           │  .railway.app     │  .railway.app     │  .railway.app │
│           └───────────────────┴───────────────────┘         │
└──────────────────────────────────────────────────────────────┘
                       │ Connect to
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              External Managed Services                       │
│  ┌────────────────┐              ┌────────────────┐         │
│  │ PostgreSQL DB  │              │  Redis Cache   │         │
│  │   (Neon)       │              │  (Upstash)     │         │
│  │                │              │                │         │
│  │  Free 3GB      │              │  Free 10K/day  │         │
│  └────────────────┘              └────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

---

### VPS/Server Deployment

```
┌──────────────────────────────────────────────────────────────┐
│                    Your VPS Server                           │
│          (DigitalOcean, AWS, Linode, etc.)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Nginx (Reverse Proxy)                 │ │
│  │              SSL/HTTPS (Let's Encrypt)                 │ │
│  │                                                        │ │
│  │  yourdomain.com → Frontend (Port 80)                  │ │
│  │  api.yourdomain.com → Backend (Port 3000)             │ │
│  │  ai.yourdomain.com → AI Service (Port 5001)           │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │            Docker Compose                            │  │
│  │                                                      │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │  │
│  │  │  Frontend    │ │   Backend    │ │ AI Service  │ │  │
│  │  │  Container   │ │  Container   │ │  Container  │ │  │
│  │  └──────────────┘ └──────────────┘ └─────────────┘ │  │
│  │                                                      │  │
│  │  ┌──────────────┐                                   │  │
│  │  │    Redis     │                                   │  │
│  │  │  Container   │                                   │  │
│  │  └──────────────┘                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────────┘
                       │ Connect to
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              External PostgreSQL                             │
│               (Neon or Supabase)                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creator-Campaign Matching

```
┌─────────────┐
│   Brand     │  1. Create Campaign
│   User      │     with requirements
└──────┬──────┘
       │ POST /v1/campaigns
       ▼
┌──────────────────┐
│    Backend       │  2. Save to database
│    Service       │     Trigger AI matching
└──────┬───────────┘
       │ POST /match with campaign data
       ▼
┌──────────────────┐
│   AI Service     │  3. Load creator profiles
│  (ML Engine)     │     Calculate compatibility
└──────┬───────────┘
       │
       │  4. For each creator:
       │     - Calculate feature scores
       │     - ML model prediction
       │     - Gemini AI insights
       │     - Final weighted score
       │
       ▼
┌──────────────────┐
│   PostgreSQL     │  5. Store match results
│   Database       │     with scores & insights
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    Backend       │  6. Return sorted matches
│    Service       │     to frontend
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Frontend       │  7. Display recommended
│   Dashboard      │     creators to brand
└──────────────────┘
```

---

## Environment Variable Flow

```
┌─────────────────────────────────────────────────────────────┐
│               .env.production (You create)                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  DATABASE_URL=postgresql://...                        │ │
│  │  REDIS_HOST=xxx.upstash.io                           │ │
│  │  REDIS_PASSWORD=xxxxx                                │ │
│  │  JWT_SECRET=xxxxxxxxxxxxxxxxxx                       │ │
│  │  GEMINI_API_KEY=xxxxxxxxxxxxx                        │ │
│  │  VITE_API_URL=https://api.yourdomain.com/v1          │ │
│  │  VITE_AI_API_URL=https://ai.yourdomain.com           │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ Loaded by
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            docker-compose.prod.yml                          │
│  Reads .env.production and injects into containers          │
└────────────────────────┬────────────────────────────────────┘
                         │ Distributed to
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Frontend    │  │   Backend    │  │  AI Service  │
│  Container   │  │   Container  │  │  Container   │
│              │  │              │  │              │
│ VITE_API_URL │  │ DATABASE_URL │  │ GEMINI_KEY   │
│ VITE_AI_URL  │  │ REDIS_*      │  │ REDIS_URL    │
│              │  │ JWT_SECRET   │  │ USE_LLM      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Request Flow Example: User Login

```
1. User enters credentials
   └─► Frontend (React Form)

2. Form submission
   └─► POST https://api.yourdomain.com/v1/auth/login
       Body: { email, password }

3. Backend receives request
   └─► AuthController.login()

4. Validate credentials
   └─► AuthService.validateUser()
       └─► Query PostgreSQL for user
           └─► Hash password and compare

5. Create session
   └─► Generate JWT token
   └─► Store session in Redis
       └─► Key: "session:{userId}"
       └─► TTL: 7 days

6. Return response
   └─► { token, user: { id, email, name, userType } }

7. Frontend stores token
   └─► localStorage.setItem('token', token)

8. Subsequent requests
   └─► Add header: Authorization: Bearer {token}
   └─► Backend validates JWT
   └─► Check session in Redis
   └─► Allow or deny request
```

---

## Scaling Architecture

### Small Scale (< 100 users)
```
1 Frontend Container → 1 Backend Container → 1 AI Container
         ↓                      ↓                    ↓
    Neon Free            Upstash Free         Gemini Free
```

### Medium Scale (100 - 1000 users)
```
1 Frontend Container → 3 Backend Containers → 2 AI Containers
         ↓                      ↓                     ↓
    Neon Pro              Upstash Pro           Gemini Pro
   (Read replicas)      (Cluster mode)        (Higher quota)
```

### Large Scale (1000+ users)
```
Load Balancer
      ↓
   ┌──┴──┐
   ▼     ▼
3x Frontend → Load Balancer → 5x Backend → Load Balancer → 3x AI
                      ↓                            ↓
              Postgres Cluster                Redis Cluster
              (Master + Replicas)            (Multiple nodes)
                      ↓                            ↓
                  PgBouncer                  Redis Sentinel
              (Connection pooling)           (High availability)
```

---

## Monitoring Stack (Recommended)

```
┌──────────────────────────────────────────────────────────┐
│                     Monitoring Layer                     │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Uptime    │  │   Error    │  │    Logs    │       │
│  │  Robot     │  │  Tracking  │  │  (Better   │       │
│  │            │  │  (Sentry)  │  │   Stack)   │       │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘       │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
         │ HTTP checks   │ Error reports │ Log aggregation
         │ every 5 min   │ in real-time  │ from all services
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Your Services (Frontend,     │
         │  Backend, AI)                 │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Alert Notifications          │
         │  - Email                      │
         │  - Slack                      │
         │  - SMS (optional)             │
         └───────────────────────────────┘
```

---

## SSL/HTTPS Setup (VPS)

```
┌──────────────────────────────────────────────────────────┐
│                    Let's Encrypt                         │
│                 (Free SSL Certificates)                  │
└────────────────────┬─────────────────────────────────────┘
                     │ Certbot requests
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   Your Domain                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  yourdomain.com         → Frontend (HTTPS)         │  │
│  │  api.yourdomain.com     → Backend API (HTTPS)      │  │
│  │  ai.yourdomain.com      → AI Service (HTTPS)       │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │ Certificate stored
                     ▼
┌──────────────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Port 443 (HTTPS) ←→ SSL Certificate               │  │
│  │  Port 80 (HTTP)   → Redirect to HTTPS              │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────┘
                     │ Proxy to
                     ▼
┌──────────────────────────────────────────────────────────┐
│              Docker Containers                           │
│  Frontend (Port 80) | Backend (3000) | AI (5001)         │
└──────────────────────────────────────────────────────────┘

Auto-renewal: Certbot cron job runs every 12 hours
```

---

## Backup Strategy

```
┌──────────────────────────────────────────────────────────┐
│                   Daily Backup Cron                      │
│                   Runs at 2 AM UTC                       │
└────────────────────┬─────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Database Backup │  │  Volume Backup   │
│  (PostgreSQL)    │  │  (AI models,     │
│                  │  │   embeddings)    │
│  pg_dump to SQL  │  │  tar.gz volumes  │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         │ Store in            │
         ▼                     ▼
┌──────────────────────────────────────────┐
│         Backup Storage                   │
│  /backups/influencia/                    │
│  ├── db_20260201.sql                     │
│  ├── db_20260131.sql                     │
│  ├── ai_models_20260201.tar.gz           │
│  └── ...                                 │
│                                          │
│  Retention: 30 days                      │
│  Auto-delete older backups               │
└──────────────────────────────────────────┘
```

---

## Complete System Health Check

```
┌─────────────────────────────────────────────────────────┐
│              Health Check Sequence                      │
└─────────────────────────────────────────────────────────┘

1. Frontend Health
   GET https://yourdomain.com/health
   Expected: 200 OK

2. Backend Health
   GET https://api.yourdomain.com/health
   Expected: { status: 'ok', database: 'connected', redis: 'connected' }

3. AI Service Health
   GET https://ai.yourdomain.com/health
   Expected: { status: 'ok', models: 'loaded', gemini: 'connected' }

4. Database Connectivity
   docker exec influencia_backend npm run db:check
   Expected: Connection successful

5. Redis Connectivity
   docker exec influencia_redis redis-cli ping
   Expected: PONG

6. Test Authentication Flow
   POST /v1/auth/register → 201 Created
   POST /v1/auth/login → 200 OK with token

7. Test AI Matching
   POST /match → 200 OK with scores

✅ All checks passed = System healthy
```

---

This architecture supports:
- ✅ Horizontal scaling (add more containers)
- ✅ Load balancing (multiple instances)
- ✅ High availability (managed databases)
- ✅ Auto-recovery (Docker restart policies)
- ✅ Monitoring & alerts
- ✅ Automated backups
- ✅ SSL/HTTPS security
- ✅ Rolling updates (zero downtime)
