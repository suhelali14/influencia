# SafarCollab - Quick Start Guide

## 🎯 Project Overview

**SafarCollab** is a comprehensive two-sided SaaS marketplace platform connecting brands with influencers/creators. The platform features:

- ✅ Multi-tenant SaaS architecture
- 🔗 Social media OAuth integration (Instagram, YouTube, TikTok)
- 🤖 AI-powered creator-campaign matching engine
- 💰 Escrow payment system with configurable commission
- 📊 Real-time analytics and reporting dashboards
- ✅ Compliance automation (ASCI, GST for India)
- 🔐 Enterprise-grade security

---

## 📁 Project Structure

```
Influencia/
├── backend/                    # NestJS API server
│   ├── migrations/            # Database migration files
│   └── src/                   # Source code (to be created)
├── frontend/                   # React + Vite app (to be created)
├── docs/                       # Documentation
│   ├── api/                   
│   │   └── openapi.yaml       # ✅ Complete API specification
│   ├── architecture/
│   │   └── SYSTEM_ARCHITECTURE.md  # ✅ System design docs
│   ├── backlog/
│   │   └── PRODUCT_BACKLOG.md      # ✅ User stories & sprints
│   ├── guides/
│   │   └── OAUTH_INTEGRATION.md    # ✅ OAuth implementation guide
│   └── DATABASE_SCHEMA.md          # ✅ Complete database schema
├── infra/                      # Infrastructure as Code (to be created)
├── docker-compose.yml          # ✅ Local development setup
├── .gitignore                  # ✅ Git ignore rules
├── package.json                # ✅ Root package configuration
├── README.md                   # ✅ Project README
└── CONTRIBUTING.md             # ✅ Contribution guidelines
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** 15+ (or use Docker)
- **Redis** 7+ (or use Docker)

### Step 1: Clone and Install

```powershell
# Navigate to project directory
cd C:\Users\Suhelali\OneDrive\Desktop\Influencia

# Install root dependencies
npm install
```

### Step 2: Set Up Environment Variables

```powershell
# Backend environment
cp backend\.env.example backend\.env

# Frontend environment
cp frontend\.env.example frontend\.env

# Edit .env files with your configuration
# At minimum, configure:
# - Database credentials
# - OAuth client IDs and secrets
# - Payment provider keys
```

### Step 3: Start Infrastructure Services

```powershell
# Start PostgreSQL, Redis, RabbitMQ, MinIO
docker-compose up -d postgres redis rabbitmq minio

# Check services are running
docker-compose ps
```

### Step 4: Initialize Database

```powershell
# Run database migrations
cd backend
npm run migration:run

# Verify tables created
# Access Adminer at http://localhost:8080
# Server: postgres
# Username: influencia_user
# Password: dev_password_123
# Database: influencia
```

### Step 5: Start Development Servers

```powershell
# Option 1: Start both backend and frontend together
npm run dev

# Option 2: Start separately
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Step 6: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:3000/api/docs
- **Database Admin**: http://localhost:8080
- **Redis Admin**: http://localhost:8001
- **RabbitMQ Admin**: http://localhost:15672 (user: influencia, pass: dev_password_123)
- **MinIO Console**: http://localhost:9001 (user: minioadmin, pass: minioadmin123)

---

## 📚 Documentation Index

### For Product Managers

1. **[Product Backlog](docs/backlog/PRODUCT_BACKLOG.md)**
   - 87 story points for Milestone 1 (Foundation)
   - 78 story points for Milestone 2 (Marketplace)
   - 112 story points for Milestone 3 (Payments)
   - Detailed acceptance criteria and tasks

2. **[System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)**
   - High-level architecture diagrams
   - Component breakdown
   - Infrastructure specifications
   - Security architecture

### For Developers

1. **[Database Schema](docs/DATABASE_SCHEMA.md)**
   - Complete PostgreSQL schema
   - Entity relationships
   - Indexes and constraints
   - Sample queries

2. **[OpenAPI Specification](docs/api/openapi.yaml)**
   - All REST API endpoints
   - Request/response schemas
   - Authentication flows
   - Error responses

3. **[OAuth Integration Guide](docs/guides/OAUTH_INTEGRATION.md)**
   - Instagram (Facebook Graph API)
   - YouTube (Google OAuth)
   - TikTok (TikTok for Developers)
   - Security best practices
   - Testing strategies

4. **[Contributing Guide](CONTRIBUTING.md)**
   - Development workflow
   - Code style guidelines
   - Testing requirements
   - PR process

### Quick Reference

| Document | Purpose | Audience |
|----------|---------|----------|
| README.md | Project overview & setup | Everyone |
| PRODUCT_BACKLOG.md | User stories & sprints | PM, Dev |
| SYSTEM_ARCHITECTURE.md | Technical design | Architects, Dev |
| DATABASE_SCHEMA.md | Data model | Backend Dev, DBA |
| openapi.yaml | API contract | Frontend & Backend Dev |
| OAUTH_INTEGRATION.md | Social integration | Backend Dev |
| CONTRIBUTING.md | Development guidelines | All developers |

---

## 🎯 MVP Milestones

### Milestone 1: Foundation (Weeks 1-4) ✅ Planned

**Goal**: User authentication + Creator onboarding + Data ingestion

**Deliverables**:
- User registration and JWT authentication
- Creator profile creation
- Instagram & YouTube OAuth connection
- Automated post sync with normalized metrics
- Creator dashboard with content feed
- CSV upload fallback

**Story Points**: 87  
**Team**: 2 backend, 2 frontend, 1 QA

---

### Milestone 2: Marketplace Core (Weeks 5-10) ✅ Planned

**Goal**: Campaign creation + AI matching + Offer management

**Deliverables**:
- Brand profile and campaign creation wizard
- Rule-based matching engine (MVP scoring algorithm)
- Shortlist generation for brands
- Recommended campaigns for creators
- Offer sending and acceptance workflow
- Platform commission configuration

**Story Points**: 78  
**Team**: 2 backend, 2 frontend, 1 QA

---

### Milestone 3: Payments & Compliance (Weeks 11-16) ✅ Planned

**Goal**: Escrow payments + Content verification + Compliance

**Deliverables**:
- Razorpay/Stripe integration
- Escrow deposit and release workflow
- Content verification (automated + manual)
- KYC submission and admin review
- GST-compliant invoice generation
- ASCI disclosure enforcement
- Analytics dashboards (creator earnings, brand campaign performance)

**Story Points**: 112  
**Team**: 2 backend, 2 frontend, 1 data engineer, 1 QA

---

### Milestone 4: Scale & Intelligence (Ongoing) 📋 Planned

**Goal**: TikTok integration + ML models + Advanced features

**Features**:
- TikTok OAuth and video ingestion
- ML-powered match scoring (XGBoost model)
- Audience demographics insights
- Fraud detection system
- Real-time webhooks
- Performance optimizations

**Priority**: P2 (Post-MVP)

---

## 🛠️ Next Steps for Development Team

### Week 1: Backend Foundation

**Tasks**:
1. Initialize NestJS project
   ```powershell
   cd backend
   npm i -g @nestjs/cli
   nest new . --package-manager npm
   ```

2. Install core dependencies
   ```powershell
   npm install @nestjs/typeorm typeorm pg @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
   npm install @nestjs/config class-validator class-transformer
   npm install --save-dev @types/bcrypt @types/passport-jwt
   ```

3. Set up database connection (TypeORM)
4. Create authentication module (JWT)
5. Create users and tenants modules
6. Write integration tests

### Week 1: Frontend Foundation

**Tasks**:
1. Initialize Vite React project
   ```powershell
   cd frontend
   npm create vite@latest . -- --template react-ts
   ```

2. Install dependencies
   ```powershell
   npm install react-router-dom @reduxjs/toolkit react-redux axios
   npm install tailwindcss postcss autoprefixer
   npm install react-hook-form zod @hookform/resolvers
   npm install recharts lucide-react
   ```

3. Set up routing
4. Create authentication pages
5. Set up Redux store
6. Create API client with axios

### Week 2-4: Continue Milestone 1

Follow the user stories in [PRODUCT_BACKLOG.md](docs/backlog/PRODUCT_BACKLOG.md)

---

## 🔑 Important Configuration

### OAuth App Registration

Before development, register apps on:

1. **Facebook Developers** (for Instagram)
   - URL: https://developers.facebook.com/
   - Create app → Select "Business" type
   - Add Instagram Basic Display and Instagram Graph API
   - Get Client ID and Secret

2. **Google Cloud Console** (for YouTube)
   - URL: https://console.cloud.google.com/
   - Create project → Enable YouTube Data API v3 and YouTube Analytics API
   - Create OAuth 2.0 credentials
   - Get Client ID and Secret

3. **TikTok for Developers** (for TikTok)
   - URL: https://developers.tiktok.com/
   - Register for TikTok for Business
   - Create app and submit for review
   - Get Client Key and Secret

### Payment Provider Setup

1. **Razorpay** (India payments)
   - URL: https://razorpay.com/
   - Create account → Get test API keys
   - Set up webhooks

2. **Stripe** (International payments)
   - URL: https://stripe.com/
   - Create account → Get test API keys
   - Set up webhook endpoints

---

## 📊 Success Metrics (MVP)

### Technical Metrics
- [ ] API response time < 200ms (p95)
- [ ] Database query time < 100ms (p95)
- [ ] Test coverage > 80%
- [ ] Zero critical security vulnerabilities
- [ ] Uptime > 99.5%

### Business Metrics
- [ ] 100 creators onboarded
- [ ] 50 social accounts connected
- [ ] 20 campaigns created
- [ ] 50 offers sent
- [ ] 10 completed transactions
- [ ] $50,000 GMV (Gross Merchandise Value)

---

## 🆘 Troubleshooting

### Docker Services Won't Start

```powershell
# Check if ports are already in use
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop and remove all containers
docker-compose down -v

# Restart
docker-compose up -d
```

### Database Migration Fails

```powershell
# Check database connection
docker exec -it influencia_postgres psql -U influencia_user -d influencia

# Reset database (CAUTION: deletes all data)
docker-compose down -v
docker-compose up -d postgres
npm run migration:run
```

### OAuth Redirect Issues

- Ensure redirect URIs in OAuth app settings match exactly
- Check for http vs https mismatch
- Verify environment variables are loaded correctly

---

## 📞 Support & Resources

### Documentation
- **API Docs**: http://localhost:3000/api/docs (when running)
- **Database Schema**: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- **Architecture**: [docs/architecture/SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md)

### External Resources
- **NestJS Docs**: https://docs.nestjs.com/
- **React Docs**: https://react.dev/
- **TypeORM Docs**: https://typeorm.io/
- **TailwindCSS Docs**: https://tailwindcss.com/docs

### Team Communication
- **Email**: dev@safarcollab.com
- **Slack**: [Team Workspace]
- **GitHub Issues**: Report bugs and feature requests

---

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

**Ready to build? Start with [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines!** 🚀

---

**Document Version**: 1.0  
**Last Updated**: November 6, 2025  
**Author**: SafarCollab Platform Team
