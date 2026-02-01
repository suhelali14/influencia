# 🚀 Quick Start Deployment Guide

The fastest way to get Influencia deployed to production.

---

## ⚡ 5-Minute Cloud Deployment (Recommended)

### Step 1: Get Your API Keys (5 minutes)

1. **PostgreSQL Database** → [Neon.tech](https://neon.tech) (Free)
   - Sign up → Create project → Copy connection string

2. **Redis** → [Upstash.com](https://upstash.com) (Free)
   - Sign up → Create database → Copy connection details

3. **Gemini AI** → [Google AI Studio](https://makersuite.google.com/app/apikey) (Free)
   - Sign in → Create API key → Copy key

### Step 2: Deploy to Railway (10 minutes)

1. **Sign up at [Railway.app](https://railway.app)** (Free $5/month credit)

2. **Create New Project** → Deploy from GitHub

3. **Add 3 Services:**

   **Backend:**
   - Root Directory: `/backend`
   - Start Command: `npm run start:prod`
   - Port: 3000
   
   **AI Service:**
   - Root Directory: `/ai`
   - Start Command: `gunicorn --bind 0.0.0.0:5001 --workers 2 api_server_v2:app`
   - Port: 5001
   
   **Frontend:**
   - Root Directory: `/frontend`
   - Start Command: `npx serve -s dist -l 80`
   - Port: 80

4. **Add Environment Variables to each service** (see `.env.example`)

5. **Generate domains for each service** (Settings → Generate Domain)

6. **Run migrations:**
   ```bash
   railway run --service backend npm run migration:run
   ```

✅ **Done! Your app is live!**

---

## 🐳 Docker Production Deployment (15 minutes)

### Prerequisites
- Docker & Docker Compose installed
- External PostgreSQL and Redis (from Neon & Upstash)

### Quick Deploy

```bash
# 1. Copy environment template
cp .env.example .env.production

# 2. Edit with your values
nano .env.production  # or use any text editor

# 3. Run the deploy script (Windows)
.\DEPLOY.ps1

# OR (Linux/Mac)
chmod +x deploy.sh
./deploy.sh

# 4. Run database migrations
docker exec -it influencia_backend npm run migration:run
```

✅ **Your app is running at:**
- Frontend: http://localhost:80
- Backend: http://localhost:3000
- AI: http://localhost:5001

---

## 🏢 VPS Server Deployment (30 minutes)

For DigitalOcean, AWS EC2, Linode, etc.

### Quick Steps

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Clone repository
git clone https://github.com/yourusername/influencia.git
cd influencia

# 5. Setup environment
cp .env.example .env.production
nano .env.production  # Add your credentials

# 6. Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 7. Run migrations
docker exec -it influencia_backend npm run migration:run

# 8. Setup Nginx & SSL (optional)
sudo apt install nginx certbot python3-certbot-nginx -y
# Then configure Nginx - see COMPLETE_DEPLOYMENT_GUIDE.md
```

---

## 📋 Required Information

Before deploying, have these ready:

| Service | Where to Get | Cost |
|---------|--------------|------|
| PostgreSQL | [Neon.tech](https://neon.tech) | Free (3GB) |
| Redis | [Upstash.com](https://upstash.com) | Free (10K/day) |
| Gemini API | [Google AI Studio](https://makersuite.google.com) | Free |
| Hosting | [Railway](https://railway.app) or VPS | $5-20/mo |

---

## ✅ Verification

After deployment, test these endpoints:

```bash
# Health checks
curl https://yourdomain.com/health          # Frontend
curl https://api.yourdomain.com/health      # Backend
curl https://ai.yourdomain.com/health       # AI Service

# Register test user
curl -X POST https://api.yourdomain.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test","userType":"brand"}'
```

All should return 200 OK.

---

## 🆘 Troubleshooting

### Services won't start?
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Common issues:
# - Wrong DATABASE_URL format
# - Missing environment variables
# - Ports already in use
```

### Database connection failed?
```bash
# Test connection
docker exec -it influencia_backend npm run db:check

# Check if DATABASE_URL is correct
# Must include ?sslmode=require for Neon
```

### Frontend shows blank page?
```bash
# Check if VITE_API_URL is correct
# Must point to your backend API URL

# Rebuild frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

---

## 📚 Full Documentation

- **Complete Guide**: [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
- **Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Environment Setup**: [.env.example](./.env.example)

---

## 🎯 Deployment Options Comparison

| Method | Difficulty | Time | Cost | Best For |
|--------|-----------|------|------|----------|
| Railway | ⭐ Easy | 15 min | $5/mo | Quick start |
| Render | ⭐⭐ Easy | 20 min | $7/mo | Simple deploy |
| Docker Local | ⭐⭐ Medium | 15 min | Free | Testing |
| VPS | ⭐⭐⭐ Hard | 30 min | $10/mo | Full control |

---

## 💡 Pro Tips

1. **Start with Railway** - Easiest and fastest
2. **Use Neon for database** - Free and reliable
3. **Enable monitoring** - Set up UptimeRobot (free)
4. **Backup daily** - Neon has automatic backups
5. **Use strong JWT secret** - Generate with `openssl rand -base64 32`

---

## 🚨 Security Checklist

Before going live:
- [ ] Strong JWT secret (32+ chars)
- [ ] HTTPS enabled
- [ ] CORS limited to your domain
- [ ] Database uses SSL
- [ ] Redis has password
- [ ] No secrets in git

---

## 🎉 Success!

Once deployed, your app will be at:
- **Frontend**: https://your-domain.com
- **API**: https://api.your-domain.com
- **AI**: https://ai.your-domain.com

**Next Steps:**
1. Set up monitoring
2. Configure backups
3. Test all features
4. Go live! 🚀

---

**Questions?** Check the [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md) or open an issue.
