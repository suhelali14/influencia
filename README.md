# SafarCollab - Influencer-Brand Marketplace Platform

## Overview
SafarCollab is a two-sided SaaS platform that matches brands with creators, provides AI-powered collaboration recommendations, and manages the complete campaign lifecycle from briefing to payment.

## Key Features
- 🔗 **Social Integration**: Connect Instagram, YouTube, TikTok accounts via OAuth
- 🤖 **Smart Matching**: AI-powered recommendation engine for brand-creator matches
- 💰 **Escrow Payments**: Secure payment flow with configurable platform commission
- 📊 **Analytics Dashboard**: Real-time metrics and performance tracking
- ✅ **Compliance**: ASCI disclosure automation and GST invoice generation
- 🔐 **Enterprise Security**: Multi-tenant SaaS with RBAC

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL 15+ with TypeORM
- **Cache/Queue**: Redis
- **Message Queue**: RabbitMQ / AWS SQS
- **Storage**: AWS S3
- **Auth**: JWT + OAuth2

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS
- **State**: Redux Toolkit / Zustand
- **Language**: TypeScript

### Infrastructure
- **Hosting**: AWS (ECS/EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Containerization**: Docker + Docker Compose

### ML & Analytics
- **Language**: Python 3.11+
- **ML**: scikit-learn, XGBoost
- **Data**: Pandas, NumPy
- **Analytics DB**: ClickHouse (future)

## Project Structure

```
Influencia/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── auth/           # Authentication & authorization
│   │   ├── creators/       # Creator management
│   │   ├── brands/         # Brand management
│   │   ├── campaigns/      # Campaign lifecycle
│   │   ├── social/         # Social media adapters
│   │   ├── matching/       # Recommendation engine
│   │   ├── payments/       # Payment & escrow
│   │   ├── compliance/     # KYC & disclosure
│   │   ├── analytics/      # Metrics & reporting
│   │   └── common/         # Shared utilities
│   ├── migrations/         # Database migrations
│   └── test/               # E2E and integration tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── features/       # Feature modules
│   │   ├── hooks/          # Custom React hooks
│   │   ├── api/            # API client
│   │   └── utils/          # Utilities
├── docs/                   # Documentation
│   ├── api/                # OpenAPI specs
│   ├── architecture/       # System design docs
│   ├── guides/             # Integration guides
│   └── backlog/            # User stories & sprints
├── infra/                  # Infrastructure as Code
│   ├── terraform/          # Terraform configs
│   ├── k8s/                # Kubernetes manifests
│   └── docker/             # Dockerfiles
└── ml/                     # ML experiments & models
    ├── notebooks/          # Jupyter notebooks
    ├── models/             # Trained models
    └── scripts/            # Training scripts
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure database and API keys in .env
npm run migration:run
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure API endpoint
npm run dev
```

### Docker Compose (Recommended for Local Development)
```bash
docker-compose up -d
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/influencia
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# OAuth Credentials
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=influencia-uploads
AWS_REGION=ap-south-1

# Platform Configuration
DEFAULT_PLATFORM_CUT_PCT=12
```

## API Documentation
- **OpenAPI Spec**: `/docs/api/openapi.yaml`
- **Swagger UI**: `http://localhost:3000/api/docs` (when backend running)
- **Postman Collection**: `/docs/api/postman-collection.json`

## Database Migrations
```bash
# Create a new migration
npm run migration:create -- CreateUsersTable

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Testing
```bash
# Backend unit tests
cd backend
npm run test

# Backend E2E tests
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

## Development Workflow

### Feature Development
1. Create feature branch from `develop`
2. Implement feature with tests
3. Create PR with description
4. Pass CI checks (lint, test, build)
5. Code review + approval
6. Merge to `develop`

### Release Process
1. Merge `develop` → `main`
2. Tag release (semantic versioning)
3. Deploy to staging
4. QA validation
5. Deploy to production

## MVP Milestones

### Milestone 1 (Week 1-4): Foundation
- ✅ User authentication & tenant setup
- ✅ Creator onboarding with social connect
- ✅ Data ingestion pipeline (IG + YouTube)
- ✅ Basic creator dashboard

### Milestone 2 (Week 5-10): Marketplace Core
- Campaign creation wizard
- Rule-based matching engine
- Offer flow & negotiations
- Platform commission config

### Milestone 3 (Week 11-16): Payments & Compliance
- Escrow integration (Razorpay/Stripe)
- Content verification
- KYC & invoice generation
- Admin dashboard

### Milestone 4 (Ongoing): Scale & Intelligence
- TikTok integration
- ML-powered scoring
- Advanced analytics
- Fraud detection

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Security
- Report vulnerabilities to: security@safarcollab.com
- See [SECURITY.md](SECURITY.md) for security policies

## License
Proprietary - All rights reserved

## Support
- Documentation: `/docs`
- Email: support@safarcollab.com
- Slack: [team workspace]

---
Built with ❤️ for creators and brands
