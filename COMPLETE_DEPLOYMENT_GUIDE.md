# 🚀 Complete Deployment Guide for Influencia Platform

This guide provides **step-by-step instructions** to deploy your complete Influencia app (Frontend, Backend, and AI Service) to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: Cloud Platform Deployment (Easiest)](#option-1-cloud-platform-deployment-easiest)
3. [Option 2: VPS/Server Deployment (Full Control)](#option-2-vpsserver-deployment-full-control)
4. [Option 3: Docker Production Deployment](#option-3-docker-production-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Domain & SSL Setup](#domain--ssl-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:

### Required Services
- [ ] **PostgreSQL Database** - Get from:
  - [Neon](https://neon.tech) (Free tier available) ✅ Recommended
  - [Supabase](https://supabase.com) (Free tier available)
  - [Railway](https://railway.app) (Postgres addon)
  
- [ ] **Redis Instance** - Get from:
  - [Upstash](https://upstash.com) (Free tier available) ✅ Recommended
  - [Redis Cloud](https://redis.com/try-free/) (Free 30MB)
  - Railway Redis addon

- [ ] **Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Tools Installed
- [ ] Git
- [ ] Docker & Docker Compose (for Option 2 & 3)
- [ ] Node.js 20+ (for local testing)
- [ ] Python 3.11+ (for AI service testing)

---

## Option 1: Cloud Platform Deployment (Easiest)

### 🎯 Deploy to Railway (Recommended for Beginners)

**Total Time: ~15 minutes**

#### Step 1: Setup External Services

1. **Create PostgreSQL Database**
   ```bash
   # Go to https://neon.tech
   # Click "Sign up" → Create new project → Copy connection string
   # Your DATABASE_URL will look like:
   # postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

2. **Create Redis Instance**
   ```bash
   # Go to https://upstash.com
   # Create account → New Database → Copy Redis URL
   # Your REDIS_URL will look like:
   # redis://default:password@xxx.upstash.io:6379
   ```

3. **Get Gemini API Key**
   ```bash
   # Go to https://makersuite.google.com/app/apikey
   # Create API key → Copy it
   ```

#### Step 2: Deploy to Railway

1. **Sign up at [Railway.app](https://railway.app)**
   - Use GitHub account for easier deployment

2. **Create New Project**
   ```
   Dashboard → New Project → Deploy from GitHub repo
   ```

3. **Add Backend Service**
   ```
   Add Service → GitHub Repo → Select 'Influencia'
   Root Directory: /backend
   Build Command: npm install && npm run build
   Start Command: npm run start:prod
   Port: 3000
   ```

   **Environment Variables for Backend:**
   ```env
   NODE_ENV=production
   DATABASE_URL=<your-neon-postgresql-url>
   REDIS_HOST=<your-upstash-host>
   REDIS_PORT=6379
   REDIS_PASSWORD=<your-upstash-password>
   REDIS_TLS=true
   JWT_SECRET=<generate-random-32-char-string>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=*
   AI_SERVICE_URL=<will-add-after-ai-deployment>
   PORT=3000
   ```

4. **Add AI Service**
   ```
   Add Service → GitHub Repo → Same repo
   Root Directory: /ai
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn --bind 0.0.0.0:5001 --workers 2 api_server_v2:app
   Port: 5001
   ```

   **Environment Variables for AI:**
   ```env
   PORT=5001
   GEMINI_API_KEY=<your-gemini-api-key>
   USE_LLM=true
   REDIS_URL=<your-upstash-redis-url>
   ```

5. **Add Frontend Service**
   ```
   Add Service → GitHub Repo → Same repo
   Root Directory: /frontend
   Build Command: npm install && npm run build
   Start Command: npx serve -s dist -l 80
   Port: 80
   ```

   **Environment Variables for Frontend:**
   ```env
   VITE_API_URL=<backend-railway-url>/v1
   VITE_AI_API_URL=<ai-service-railway-url>
   ```

6. **Update Backend with AI Service URL**
   - Go to Backend service settings
   - Add: `AI_SERVICE_URL=<your-ai-service-railway-url>`

7. **Generate Domains**
   ```
   Each service → Settings → Generate Domain
   You'll get URLs like:
   - Frontend: https://influencia-frontend.up.railway.app
   - Backend: https://influencia-backend.up.railway.app
   - AI: https://influencia-ai.up.railway.app
   ```

#### Step 3: Run Database Migrations

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run --service backend npm run migration:run
```

**✅ Your app is now live!**

---

### 🎯 Deploy to Render

1. **Go to [Render.com](https://render.com)**
2. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Copy Internal Database URL

3. **Create Redis Instance**
   - New → Redis
   - Copy Redis URL

4. **Deploy Backend**
   ```
   New → Web Service
   Connect GitHub repo
   Root Directory: backend
   Build Command: npm install && npm run build
   Start Command: npm run start:prod
   ```

5. **Deploy AI Service**
   ```
   New → Web Service
   Root Directory: ai
   Runtime: Python
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn --bind 0.0.0.0:$PORT --workers 2 api_server_v2:app
   ```

6. **Deploy Frontend**
   ```
   New → Static Site
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

---

## Option 2: VPS/Server Deployment (Full Control)

**For: DigitalOcean, AWS EC2, Linode, Vultr, etc.**

### Step 1: Server Setup

1. **Create Ubuntu Server (20.04+)**
   ```bash
   # Minimum specs:
   # - 2 CPU cores
   # - 4GB RAM
   # - 50GB SSD
   ```

2. **SSH into Server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose

   # Install Nginx (for reverse proxy)
   sudo apt install nginx certbot python3-certbot-nginx -y

   # Install Node.js (for migrations)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install nodejs -y
   ```

### Step 2: Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/influencia
cd /var/www/influencia

# Clone your repository
git clone https://github.com/yourusername/influencia.git .

# Make deploy scripts executable
chmod +x *.ps1
```

### Step 3: Configure Environment

```bash
# Create production environment file
nano .env.production
```

**Add the following:**
```env
# Database (Neon/Supabase or local)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Redis (Upstash or local)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS=true

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Frontend URLs (will update after domain setup)
VITE_API_URL=http://your-server-ip:3000/v1
VITE_AI_API_URL=http://your-server-ip:5001

# AI Service
GEMINI_API_KEY=your-gemini-api-key
USE_LLM=true

# CORS
CORS_ORIGIN=*
```

### Step 4: Deploy with Docker

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Run Database Migrations

```bash
# Connect to backend container
docker exec -it influencia_backend sh

# Inside container, run migrations
npm run migration:run

# Exit container
exit
```

### Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/influencia
```

**Add this configuration:**
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }
}

# AI Service
server {
    listen 80;
    server_name ai.yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```

**Enable the site:**
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/influencia /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: Setup SSL (HTTPS)

```bash
# Get SSL certificates for all domains
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com -d ai.yourdomain.com

# Auto-renewal is setup automatically
# Test renewal with:
sudo certbot renew --dry-run
```

**✅ Your app is now running with HTTPS!**

---

## Option 3: Docker Production Deployment

### Quick Deploy (All Services)

```bash
# 1. Setup environment
cp .env.example .env.production
nano .env.production  # Add your values

# 2. Build all services
docker-compose -f docker-compose.prod.yml build

# 3. Start all services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check status
docker-compose -f docker-compose.prod.yml ps

# 5. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Individual Service Commands

```bash
# Start only backend
docker-compose -f docker-compose.prod.yml up -d backend

# Start only AI service
docker-compose -f docker-compose.prod.yml up -d ai

# Start only frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose -f docker-compose.prod.yml down -v
```

---

## Post-Deployment Verification

### 1. Check Health Endpoints

```bash
# Frontend health
curl http://your-domain.com/health

# Backend health
curl http://api.your-domain.com/health

# AI service health
curl http://ai.your-domain.com/health
```

### 2. Test API Endpoints

```bash
# Register a user
curl -X POST http://api.your-domain.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User",
    "userType": "brand"
  }'

# Login
curl -X POST http://api.your-domain.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'
```

### 3. Test AI Service

```bash
# Health check
curl http://ai.your-domain.com/health

# Test matching endpoint
curl -X POST http://ai.your-domain.com/match \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": {
      "description": "Tech product launch"
    },
    "creators": [
      {"id": 1, "niche": "technology"}
    ]
  }'
```

### 4. Monitor Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f ai
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

## Domain & SSL Setup

### 1. Point Domain to Server

**Add these DNS records at your domain registrar:**

```
Type    Name    Value               TTL
A       @       your-server-ip      3600
A       www     your-server-ip      3600
A       api     your-server-ip      3600
A       ai      your-server-ip      3600
```

### 2. Update Environment Variables

```bash
# Update frontend env
VITE_API_URL=https://api.yourdomain.com/v1
VITE_AI_API_URL=https://ai.yourdomain.com

# Update backend env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rebuild services
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

### 3. Get SSL Certificate

```bash
# Using Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com -d ai.yourdomain.com

# Follow prompts, certificates will auto-renew
```

---

## Monitoring & Maintenance

### Setup Monitoring

1. **Uptime Monitoring**
   - [UptimeRobot](https://uptimerobot.com) (Free)
   - Monitor all 3 services every 5 minutes

2. **Log Monitoring**
   - [Better Stack](https://betterstack.com) (Free tier)
   - Aggregate logs from all services

3. **Error Tracking**
   - [Sentry](https://sentry.io) (Free tier)
   - Track backend and frontend errors

### Regular Maintenance Tasks

```bash
# 1. Update application
cd /var/www/influencia
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# 2. Backup database
docker exec influencia_backend npm run db:backup

# 3. Check disk space
df -h

# 4. Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=100 | grep ERROR

# 5. Restart services if needed
docker-compose -f docker-compose.prod.yml restart

# 6. Clean up old images
docker system prune -a
```

### Auto-Backup Script

```bash
# Create backup script
sudo nano /usr/local/bin/backup-influencia.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/influencia"
mkdir -p $BACKUP_DIR

# Backup database
docker exec influencia_backend npm run db:backup > $BACKUP_DIR/db_$DATE.sql

# Backup volumes
docker run --rm -v influencia_ai_models:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/ai_models_$DATE.tar.gz -C /data .

# Delete old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-influencia.sh

# Add to cron (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-influencia.sh
```

---

## Scaling Guidelines

### When to Scale

- **CPU > 70%**: Add more workers
- **Memory > 80%**: Increase container memory
- **Response time > 1s**: Add replicas

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3
  
ai:
  deploy:
    replicas: 2
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_creators_niche ON creators(niche);
CREATE INDEX idx_matches_score ON matches(score);
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common fixes:
# 1. Check DATABASE_URL
docker exec -it influencia_backend env | grep DATABASE

# 2. Test database connection
docker exec -it influencia_backend npm run db:check

# 3. Restart service
docker-compose -f docker-compose.prod.yml restart backend
```

### AI Service Slow

```bash
# Check memory usage
docker stats influencia_ai

# Increase memory limit
docker-compose -f docker-compose.prod.yml stop ai
# Edit docker-compose.prod.yml, add:
# mem_limit: 2g
docker-compose -f docker-compose.prod.yml up -d ai
```

### Frontend Not Loading

```bash
# Check if build succeeded
docker exec -it influencia_frontend ls /usr/share/nginx/html

# Check Nginx logs
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

### Redis Connection Issues

```bash
# Test Redis connection
docker exec -it influencia_redis redis-cli ping

# Check Redis stats
docker exec -it influencia_redis redis-cli info

# Flush cache if needed
docker exec -it influencia_redis redis-cli FLUSHALL
```

---

## Security Checklist

- [ ] **HTTPS Enabled** - All domains use SSL
- [ ] **Strong JWT Secret** - 32+ random characters
- [ ] **Database SSL** - Enabled in production
- [ ] **Redis Password** - Set and secure
- [ ] **CORS Configured** - Limited to your domains
- [ ] **Rate Limiting** - Enabled in backend
- [ ] **Firewall Rules** - Only necessary ports open
- [ ] **Regular Updates** - Keep dependencies updated
- [ ] **Backups Automated** - Daily database backups
- [ ] **Monitoring Active** - Uptime and error tracking

---

## Cost Estimates

### Free Tier Deployment (Railway/Render + Neon + Upstash)
- **Database**: Free (Neon 3GB)
- **Redis**: Free (Upstash 10K commands/day)
- **Hosting**: $5-10/month (Railway/Render)
- **Total**: ~$5-10/month

### VPS Deployment
- **Server**: $10-20/month (DigitalOcean/Linode)
- **Database**: Free (Neon) or $7/month (managed)
- **Redis**: Free (Upstash) or $5/month (managed)
- **Domain**: $10-15/year
- **Total**: ~$15-30/month

---

## Support & Help

### Quick Checks

1. **All services running?**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Check health endpoints:**
   - Frontend: `http://your-domain/health`
   - Backend: `http://api.your-domain/health`
   - AI: `http://ai.your-domain/health`

3. **Review logs for errors:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=50
   ```

### Getting Help

- Check logs for specific error messages
- Review the [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed info
- Ensure all environment variables are set correctly
- Verify database and Redis connections

---

## 🎉 Congratulations!

Your Influencia platform is now deployed and ready for production use!

**Next Steps:**
1. Set up monitoring and alerts
2. Configure automated backups
3. Test all features thoroughly
4. Set up analytics and tracking
5. Plan for scaling as you grow

---

**Need Help?** Open an issue on GitHub with:
- Error messages
- Deployment method used
- Steps to reproduce the issue
