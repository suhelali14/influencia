# 🚀 Influencia Deployment - Complete Package

## 📦 What You Have

Your Influencia platform is now ready for deployment with a complete deployment package including:

### Documentation Files
1. **QUICKSTART_DEPLOY.md** - Start here! 5-minute quick start guide
2. **COMPLETE_DEPLOYMENT_GUIDE.md** - Comprehensive step-by-step guide with all options
3. **DEPLOYMENT_CHECKLIST.md** - Detailed checklist to ensure nothing is missed
4. **.env.example** - Template for environment variables

### Deployment Scripts
1. **check-deploy.ps1** - Pre-deployment validation (Windows)
2. **DEPLOY.ps1** - Automated deployment script (Windows)
3. **deploy.sh** - Automated deployment script (Linux/Mac)

### Docker Configuration
1. **docker-compose.prod.yml** - Production Docker Compose configuration
2. **backend/Dockerfile** - Backend production image
3. **ai/Dockerfile** - AI service production image
4. **frontend/Dockerfile** - Frontend production image

---

## 🎯 Deployment Options

### Option 1: Cloud Platform (Easiest) ⭐ Recommended
**Time: 15 minutes | Difficulty: Easy | Cost: ~$5/month**

Best for: Getting started quickly, no server management

**Platforms:**
- Railway.app (Recommended)
- Render.com
- DigitalOcean App Platform

**Steps:**
1. Get free database (Neon.tech)
2. Get free Redis (Upstash.com)
3. Get free Gemini API key
4. Deploy to Railway (3 services)
5. Done!

📖 **Guide:** [QUICKSTART_DEPLOY.md](./QUICKSTART_DEPLOY.md)

---

### Option 2: Docker Production (Medium)
**Time: 20 minutes | Difficulty: Medium | Cost: ~$10/month**

Best for: Full control, predictable costs, Docker experience

**Requirements:**
- Docker & Docker Compose installed
- External PostgreSQL (Neon.tech)
- External Redis (Upstash.com)

**Steps:**
1. Setup .env.production
2. Run pre-deployment check: `.\check-deploy.ps1`
3. Run deployment: `.\DEPLOY.ps1`
4. Done!

📖 **Guide:** [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md#option-3-docker-production-deployment)

---

### Option 3: VPS Server (Advanced)
**Time: 30-45 minutes | Difficulty: Hard | Cost: ~$10-20/month**

Best for: Complete control, custom domain, production-ready

**Platforms:**
- DigitalOcean Droplets
- AWS EC2
- Linode
- Vultr

**Steps:**
1. Create Ubuntu server
2. Install Docker + Nginx
3. Clone repository
4. Deploy services
5. Configure SSL with Let's Encrypt

📖 **Guide:** [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md#option-2-vpsserver-deployment-full-control)

---

## 🚀 Quick Start (3 Steps)

### 1️⃣ Get Your Services (5 minutes)

```bash
# Sign up and get credentials from:
1. Database → https://neon.tech (Free 3GB)
2. Redis → https://upstash.com (Free 10K/day)
3. AI API → https://makersuite.google.com (Free)
```

### 2️⃣ Configure Environment (2 minutes)

```powershell
# Copy template
Copy-Item .env.example .env.production

# Edit with your credentials
notepad .env.production

# Add your:
# - DATABASE_URL from Neon
# - REDIS_HOST, REDIS_PASSWORD from Upstash
# - GEMINI_API_KEY from Google AI Studio
# - JWT_SECRET (generate random 32+ chars)
```

### 3️⃣ Deploy (10 minutes)

**For Cloud (Railway):**
```bash
1. Go to https://railway.app
2. Create project from GitHub
3. Add 3 services (backend, ai, frontend)
4. Add environment variables
5. Deploy!
```

**For Docker:**
```powershell
# Check everything is ready
.\check-deploy.ps1

# Deploy all services
.\DEPLOY.ps1

# Run migrations
docker exec -it influencia_backend npm run migration:run
```

✅ **Done! Your app is live!**

---

## 📋 Pre-Deployment Checklist

Run the automated check:
```powershell
.\check-deploy.ps1
```

This verifies:
- [ ] .env.production exists and is valid
- [ ] All required environment variables set
- [ ] JWT secret is strong (32+ chars)
- [ ] Database URL format correct
- [ ] Docker installed and running
- [ ] Docker Compose available
- [ ] All Dockerfile exist

---

## 🔧 Required Environment Variables

### Must Have (Critical)
```env
DATABASE_URL=postgresql://...          # From Neon/Supabase
REDIS_HOST=...                         # From Upstash
REDIS_PASSWORD=...                     # From Upstash
JWT_SECRET=...                         # Generate random 32+ chars
GEMINI_API_KEY=...                     # From Google AI Studio
```

### Frontend URLs
```env
VITE_API_URL=https://api.yourdomain.com/v1
VITE_AI_API_URL=https://ai.yourdomain.com
```

### Optional
```env
CORS_ORIGIN=https://yourdomain.com     # Your domain
NODE_ENV=production
USE_LLM=true
```

📖 **Full list:** [.env.example](./.env.example)

---

## ✅ Post-Deployment Verification

### 1. Check Service Health
```bash
# All should return 200 OK
curl http://localhost:3000/health      # Backend
curl http://localhost:5001/health      # AI Service
curl http://localhost:80/health        # Frontend (if exists)
```

### 2. Test Authentication
```bash
# Register a test user
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User",
    "userType": "brand"
  }'
```

### 3. Check Logs
```powershell
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## 🆘 Troubleshooting

### Services Won't Start
```powershell
# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Wrong DATABASE_URL format
# - Missing environment variables in .env.production
# - Ports already in use (close other apps on ports 3000, 5001, 80)
```

### Database Connection Failed
```powershell
# Verify DATABASE_URL format
# Must be: postgresql://user:password@host:5432/database?sslmode=require
# For Neon, ?sslmode=require is REQUIRED

# Test inside container
docker exec -it influencia_backend sh
npm run db:check
```

### Frontend Shows Errors
```powershell
# Check API URLs in .env.production
# VITE_API_URL must point to backend
# VITE_AI_API_URL must point to AI service

# Rebuild frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

### AI Service Slow/Errors
```powershell
# Check Gemini API key
# Get new key from: https://makersuite.google.com

# Restart AI service
docker-compose -f docker-compose.prod.yml restart ai
```

---

## 📊 Cost Breakdown

### Free Tier (Perfect for Testing)
- ✅ Database: Neon (Free 3GB)
- ✅ Redis: Upstash (Free 10K commands/day)
- ✅ AI: Gemini API (Free tier)
- ✅ Hosting: Railway ($5 credit)
- **Total: FREE for first month**

### Production (Recommended)
- 💰 Database: Neon Pro ($19/month) or keep free
- 💰 Redis: Upstash Pro ($10/month) or keep free
- 💰 AI: Gemini API (Pay per use, ~$5/month)
- 💰 Hosting: Railway/Render ($10-20/month)
- **Total: ~$15-30/month**

### Enterprise (High Traffic)
- 💰 Database: Neon Scale ($69/month)
- 💰 Redis: Redis Cloud ($25/month)
- 💰 AI: Gemini API (Pay per use, ~$20/month)
- 💰 Hosting: VPS ($20-50/month) or Railway Scale
- **Total: ~$100-150/month**

---

## 🔒 Security Checklist

Before going live, ensure:
- [ ] Strong JWT secret (32+ random characters)
- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS limited to your domain(s)
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] Redis uses password and TLS
- [ ] No secrets committed to git
- [ ] `.env.production` in `.gitignore`
- [ ] Environment variables in platform (not in code)
- [ ] Rate limiting enabled
- [ ] Firewall configured (if VPS)

---

## 📈 Scaling Guidelines

### When to Scale
- CPU usage > 70% consistently
- Memory usage > 80%
- API response time > 1 second
- More than 100 concurrent users

### How to Scale

**Horizontal (Add more instances):**
```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3  # Run 3 backend instances
```

**Vertical (Bigger machines):**
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

**Database:**
- Upgrade Neon tier for more connections
- Add read replicas for read-heavy workloads
- Use connection pooling (PgBouncer)

---

## 📚 Complete Documentation Index

### Quick Start
- **5-Minute Deploy**: [QUICKSTART_DEPLOY.md](./QUICKSTART_DEPLOY.md)

### Complete Guides
- **Full Deployment Guide**: [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
- **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

### Configuration
- **Environment Variables**: [.env.example](./.env.example)
- **Docker Compose**: [docker-compose.prod.yml](./docker-compose.prod.yml)

### Scripts
- **Pre-deployment Check**: [check-deploy.ps1](./check-deploy.ps1)
- **Deploy Script (Windows)**: [DEPLOY.ps1](./DEPLOY.ps1)
- **Deploy Script (Linux/Mac)**: [deploy.sh](./deploy.sh)

### Existing Docs
- **Development Setup**: [README.md](./README.md)
- **Gemini Setup**: [GEMINI_SETUP_GUIDE.md](./GEMINI_SETUP_GUIDE.md)
- **Testing Guide**: [COMPLETE_TESTING_GUIDE.md](./COMPLETE_TESTING_GUIDE.md)

---

## 🎯 Recommended Deployment Path

### For Beginners
1. Read [QUICKSTART_DEPLOY.md](./QUICKSTART_DEPLOY.md)
2. Deploy to Railway (easiest)
3. Use free tiers (Neon + Upstash)
4. Total cost: ~$5/month

### For Developers
1. Read [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
2. Use Docker locally first
3. Then deploy to VPS
4. Setup monitoring

### For Production
1. Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
2. Deploy to VPS with SSL
3. Setup monitoring (UptimeRobot)
4. Configure backups
5. Enable auto-scaling

---

## 🌟 Next Steps After Deployment

1. **Setup Monitoring**
   - UptimeRobot for uptime (free)
   - Sentry for error tracking (free tier)
   - Better Stack for logs (optional)

2. **Configure Backups**
   - Database: Neon auto-backups (enabled by default)
   - Manual backup script available in guide

3. **Custom Domain** (Optional)
   - Buy domain ($10-15/year)
   - Point to your servers
   - Setup SSL with Let's Encrypt (free)

4. **Performance Optimization**
   - Enable Redis caching
   - Add CDN for frontend (Cloudflare free)
   - Optimize database queries

5. **Go Live!** 🚀
   - Test all features
   - Announce your launch
   - Monitor for issues

---

## 💡 Pro Tips

1. **Start Simple**: Deploy to Railway first, then move to VPS later
2. **Use Free Tiers**: Neon + Upstash free tiers are perfect for starting
3. **Monitor Early**: Set up UptimeRobot from day 1
4. **Backup Often**: Neon auto-backup + weekly manual backups
5. **Test First**: Deploy to staging before production
6. **SSL Always**: Use Let's Encrypt (free) or Cloudflare (free)
7. **Environment Variables**: Never commit secrets to git
8. **Update Regularly**: Keep dependencies updated for security

---

## 🆘 Getting Help

### Quick Checks
```powershell
# Are services running?
docker-compose -f docker-compose.prod.yml ps

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:5001/health
```

### Common Issues & Solutions
1. **Port conflicts**: Stop other services on ports 3000, 5001, 80
2. **Database errors**: Check DATABASE_URL format and SSL mode
3. **Redis errors**: Verify REDIS_HOST and REDIS_PASSWORD
4. **Build failures**: Check Docker has enough memory (4GB+)

### Documentation
- Check [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
- Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- Run `.\check-deploy.ps1` to validate setup

---

## ✨ Success Metrics

Your deployment is successful when:

✅ All services running (docker-compose ps shows "Up")
✅ Health checks passing (all return 200 OK)
✅ User registration works
✅ Login and authentication work
✅ AI matching returns results
✅ Frontend loads without errors
✅ No critical errors in logs
✅ Response times < 2 seconds
✅ SSL/HTTPS enabled (if using domain)
✅ Monitoring active

---

## 🎉 You're Ready!

Everything you need to deploy Influencia is now at your fingertips.

**Choose your path:**
- 🚀 **Quick & Easy**: [QUICKSTART_DEPLOY.md](./QUICKSTART_DEPLOY.md) → Railway
- 📖 **Complete Guide**: [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) → All options
- ✅ **Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) → Don't miss anything

**Good luck with your deployment! 🚀**

---

*Last updated: February 1, 2026*
*Deployment Package v1.0*
