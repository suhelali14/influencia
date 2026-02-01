# 🚀 Influencia Deployment Guide

This guide covers deploying Influencia to production.

## Prerequisites

- Docker & Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Redis instance (Redis Cloud or self-hosted)

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/your-repo/influencia.git
cd influencia

# Copy environment template
cp .env.example .env.production
```

### 2. Configure Environment Variables

Edit `.env.production`:

```env
# Database (use your production database URL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Frontend URLs
VITE_API_URL=https://api.yourdomain.com/v1
VITE_AI_API_URL=https://ai.yourdomain.com

# AI Service
GEMINI_API_KEY=your-gemini-api-key
USE_LLM=true

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Build & Deploy

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Setup Reverse Proxy (Nginx)

If running on a VPS, configure Nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/influencia

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API Backend
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}

# AI Service
server {
    listen 443 ssl http2;
    server_name ai.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```

---

## Cloud Deployments

### Deploy to Railway

1. Create new project at [railway.app](https://railway.app)
2. Add services:
   - GitHub repo for backend
   - GitHub repo for frontend
   - Redis add-on
3. Configure environment variables
4. Deploy!

### Deploy to Render

1. Create new Web Services at [render.com](https://render.com)
2. Connect GitHub repo
3. Configure:
   - Backend: `cd backend && npm install && npm run build && npm run start:prod`
   - Frontend: `cd frontend && npm install && npm run build`
   - AI: `cd ai && pip install -r requirements.txt && gunicorn api_server_v2:app`

### Deploy to DigitalOcean App Platform

1. Create new App
2. Add components:
   - Backend (NestJS)
   - Frontend (Static Site)
   - Worker (AI Service)
3. Add managed Redis
4. Configure environment variables

---

## Health Checks

After deployment, verify all services:

```bash
# Frontend
curl https://yourdomain.com/health

# Backend
curl https://api.yourdomain.com/health

# AI Service
curl https://ai.yourdomain.com/health
```

---

## Monitoring

### Recommended Tools

1. **Uptime**: UptimeRobot or Better Uptime
2. **Logs**: LogDNA, Papertrail, or Datadog
3. **Errors**: Sentry
4. **Metrics**: Prometheus + Grafana

### Key Metrics to Monitor

- API response times (p50, p95, p99)
- Error rates
- Database connection pool
- Redis memory usage
- AI service latency

---

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    replicas: 3
```

### Database Scaling

- Use connection pooling (PgBouncer)
- Read replicas for read-heavy workloads
- Consider serverless Postgres (Neon)

### Redis Scaling

- Redis Cluster for high availability
- Separate instances for sessions vs cache

---

## Backup & Recovery

### Database Backups

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260126.sql
```

### Redis Persistence

Redis is configured with AOF persistence. Backups are in `/data/appendonly.aof`.

---

## Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] Environment variables secured (not in git)
- [ ] Strong JWT secret (32+ characters)
- [ ] Rate limiting enabled
- [ ] CORS configured for production domains
- [ ] Database SSL enabled
- [ ] Redis password set
- [ ] Regular security updates

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - DATABASE_URL incorrect
# - Redis connection failed
# - Port already in use
```

### AI service slow

```bash
# Check memory usage
docker stats influencia_ai

# Solutions:
# - Increase container memory
# - Enable caching
# - Disable LLM if not needed
```

### Redis connection errors

```bash
# Test connection
docker exec influencia_redis redis-cli ping

# If using Redis Cloud, ensure:
# - TLS settings correct
# - Password included in URL
# - Firewall allows connection
```

---

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Review health endpoints
3. Open GitHub issue with:
   - Error messages
   - Environment (cloud/self-hosted)
   - Steps to reproduce
