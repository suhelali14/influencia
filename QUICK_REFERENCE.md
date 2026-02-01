# 🚀 INFLUENCIA DEPLOYMENT - QUICK REFERENCE CARD

## ⚡ FASTEST DEPLOY (15 MINUTES)

### 1. GET FREE SERVICES (5 min)
```
┌────────────────────────────────────────────────┐
│ DATABASE  → https://neon.tech                  │
│             Sign up → Create project           │
│             Copy connection string             │
│                                                │
│ REDIS     → https://upstash.com                │
│             Sign up → Create database          │
│             Copy host & password               │
│                                                │
│ AI API    → https://makersuite.google.com      │
│             Sign in → Create API key           │
└────────────────────────────────────────────────┘
```

### 2. CONFIGURE (2 min)
```powershell
Copy-Item .env.example .env.production
notepad .env.production
# Add your credentials from step 1
```

### 3. DEPLOY TO RAILWAY (10 min)
```
1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub repo
4. Add 3 services:
   ├─ Backend  (root: /backend, port: 3000)
   ├─ AI       (root: /ai, port: 5001)
   └─ Frontend (root: /frontend, port: 80)
5. Add environment variables to each
6. Generate domains
7. Done! ✅
```

---

## 🐳 DOCKER DEPLOY (20 MINUTES)

```powershell
# 1. Check setup
.\check-deploy.ps1

# 2. Deploy
.\DEPLOY.ps1

# 3. Run migrations
docker exec -it influencia_backend npm run migration:run

# 4. Verify
curl http://localhost:3000/health
```

---

## 📋 ESSENTIAL ENVIRONMENT VARIABLES

```env
# Required - Get from services above
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
REDIS_HOST=xxx.upstash.io
REDIS_PASSWORD=xxxxx
JWT_SECRET=xxxxx-32-chars-minimum-xxxxx
GEMINI_API_KEY=xxxxxxxxxxxxx

# Frontend URLs
VITE_API_URL=https://api.yourdomain.com/v1
VITE_AI_API_URL=https://ai.yourdomain.com
```

---

## ✅ HEALTH CHECKS

```bash
# Backend
curl http://localhost:3000/health

# AI Service
curl http://localhost:5001/health

# Test Login
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test","userType":"brand"}'
```

---

## 🆘 COMMON ISSUES & FIXES

| Issue | Solution |
|-------|----------|
| **Services won't start** | `docker-compose -f docker-compose.prod.yml logs -f` |
| **DB connection failed** | Check DATABASE_URL includes `?sslmode=require` |
| **Frontend blank** | Verify VITE_API_URL in .env.production |
| **AI errors** | Check GEMINI_API_KEY is valid |
| **Port in use** | Stop other services on ports 3000, 5001, 80 |

---

## 📚 DOCUMENTATION

| File | Purpose |
|------|---------|
| **QUICKSTART_DEPLOY.md** | ⚡ 15-min quick start |
| **COMPLETE_DEPLOYMENT_GUIDE.md** | 📖 Full guide (all options) |
| **DEPLOYMENT_CHECKLIST.md** | ✅ Step-by-step checklist |
| **check-deploy.ps1** | 🔍 Pre-deployment validation |
| **DEPLOY.ps1** | 🚀 Auto-deploy (Windows) |

---

## 💰 COST ESTIMATES

| Tier | Monthly Cost | What You Get |
|------|--------------|--------------|
| **Free** | $0 | Neon 3GB + Upstash + Gemini free tiers |
| **Starter** | $5-10 | Railway/Render + free DB/Redis |
| **Production** | $15-30 | Paid hosting + upgraded DB/Redis |

---

## 🎯 SUCCESS CHECKLIST

- [ ] All services running (`docker ps` or Railway dashboard)
- [ ] Health checks return 200 OK
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Dashboard loads without errors
- [ ] AI matching returns results
- [ ] No errors in logs

---

## 🔧 USEFUL COMMANDS

```powershell
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Rebuild specific service
docker-compose -f docker-compose.prod.yml up -d --build backend

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🚀 DEPLOYMENT FLOW

```
Step 1: Get Services (5 min)
   ↓
Step 2: Configure .env.production (2 min)
   ↓
Step 3: Choose deployment method
   ├─ Cloud (Railway) → 10 min  ⭐ EASIEST
   ├─ Docker Local → 15 min
   └─ VPS Server → 30 min
   ↓
Step 4: Run migrations
   ↓
Step 5: Verify health checks
   ↓
✅ LIVE!
```

---

## 📊 ARCHITECTURE OVERVIEW

```
┌──────────────┐
│   Frontend   │ ← Users interact here
│   (React)    │
└──────┬───────┘
       │ API calls
       ▼
┌──────────────┐
│   Backend    │ ← Business logic
│   (NestJS)   │
└──┬───────┬───┘
   │       │
   ▼       ▼
┌─────┐ ┌────────┐
│ DB  │ │   AI   │ ← ML matching
│(PG) │ │(Flask) │
└─────┘ └────────┘
```

---

## 🔗 QUICK LINKS

- **Neon (Database):** https://neon.tech
- **Upstash (Redis):** https://upstash.com
- **Gemini API:** https://makersuite.google.com
- **Railway (Hosting):** https://railway.app
- **Render (Alternative):** https://render.com
- **UptimeRobot (Monitoring):** https://uptimerobot.com
- **Sentry (Errors):** https://sentry.io

---

## 💡 PRO TIPS

✅ Start with Railway (easiest)
✅ Use free tiers to start
✅ Setup monitoring day 1
✅ Test locally with Docker first
✅ Never commit .env.production
✅ Generate strong JWT secret (32+ chars)
✅ Enable HTTPS in production

---

## 🎊 READY TO GO!

**Pick your method:**
- 🚀 **Fastest:** Railway (15 min) → [QUICKSTART_DEPLOY.md](./QUICKSTART_DEPLOY.md)
- 🐳 **Docker:** Local/VPS (20 min) → [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
- 📋 **Detailed:** Step-by-step → [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

**Commands to get started:**
```powershell
# Check if ready
.\check-deploy.ps1

# Deploy
.\DEPLOY.ps1
```

---

**PRINT THIS CARD AND KEEP IT HANDY! 📌**
