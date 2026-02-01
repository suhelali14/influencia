# 📋 Deployment Checklist for Influencia

Use this checklist to ensure a smooth deployment process.

---

## Pre-Deployment Setup

### 1. External Services Setup
- [ ] **PostgreSQL Database Created**
  - [ ] Neon account created at https://neon.tech
  - [ ] New project created
  - [ ] Connection string copied
  - [ ] SSL mode enabled
  
- [ ] **Redis Instance Created**
  - [ ] Upstash account created at https://upstash.com
  - [ ] New database created
  - [ ] Redis URL and credentials copied
  - [ ] TLS enabled
  
- [ ] **Gemini API Key Obtained**
  - [ ] Google AI Studio account at https://makersuite.google.com
  - [ ] API key generated
  - [ ] API key tested

- [ ] **Domain Name** (Optional but recommended)
  - [ ] Domain purchased
  - [ ] DNS access available
  - [ ] DNS records can be modified

---

## Configuration

### 2. Environment Variables
- [ ] `.env.production` file created from `.env.example`
- [ ] `DATABASE_URL` configured
- [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` configured
- [ ] `JWT_SECRET` generated (32+ characters)
- [ ] `GEMINI_API_KEY` added
- [ ] `VITE_API_URL` configured
- [ ] `VITE_AI_API_URL` configured
- [ ] `CORS_ORIGIN` set to your domain(s)

### 3. JWT Secret Generation
```bash
# Generate secure JWT secret
openssl rand -base64 32
```
- [ ] JWT secret generated
- [ ] JWT secret added to `.env.production`

---

## Deployment Method Selection

Choose ONE deployment method:

### Option A: Cloud Platform (Easiest)
- [ ] Railway/Render account created
- [ ] Repository connected to platform
- [ ] Backend service configured
- [ ] AI service configured
- [ ] Frontend service configured
- [ ] Environment variables added to all services
- [ ] Services deployed and running

### Option B: VPS/Server
- [ ] VPS created (DigitalOcean, AWS, Linode, etc.)
- [ ] SSH access configured
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Nginx installed
- [ ] Repository cloned to server
- [ ] `.env.production` uploaded to server
- [ ] Services built with Docker Compose
- [ ] Nginx reverse proxy configured

### Option C: Local Docker Production
- [ ] Docker and Docker Compose installed
- [ ] `.env.production` configured
- [ ] All services built
- [ ] All services started

---

## Database Setup

### 4. Database Migrations
- [ ] Database connection tested
- [ ] Migrations executed successfully
- [ ] Tables created and verified
- [ ] Initial data seeded (if needed)

```bash
# For Docker deployment
docker exec -it influencia_backend npm run migration:run

# For Railway/Render
railway run npm run migration:run
# OR via Render shell
```

---

## Service Verification

### 5. Backend Service
- [ ] Backend service running
- [ ] Health endpoint responding: `/health`
- [ ] Database connection working
- [ ] Redis connection working
- [ ] API endpoints accessible
- [ ] Authentication working (register/login)

**Test Commands:**
```bash
# Health check
curl https://api.yourdomain.com/health

# Register test user
curl -X POST https://api.yourdomain.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test","userType":"brand"}'
```
- [ ] Health check passed
- [ ] User registration successful
- [ ] Login successful

### 6. AI Service
- [ ] AI service running
- [ ] Health endpoint responding: `/health`
- [ ] Gemini API connected
- [ ] Redis cache working
- [ ] Matching endpoint functional

**Test Commands:**
```bash
# Health check
curl https://ai.yourdomain.com/health

# Test matching
curl -X POST https://ai.yourdomain.com/match \
  -H "Content-Type: application/json" \
  -d '{"campaign":{"description":"test"},"creators":[{"id":1}]}'
```
- [ ] Health check passed
- [ ] Matching endpoint working
- [ ] Response time acceptable (<2s)

### 7. Frontend Service
- [ ] Frontend service running
- [ ] Website loading correctly
- [ ] API connection working
- [ ] AI service connection working
- [ ] All pages accessible
- [ ] Assets loading correctly

**Manual Checks:**
- [ ] Homepage loads
- [ ] Login page works
- [ ] Dashboard accessible after login
- [ ] No console errors in browser
- [ ] Mobile responsive

---

## Domain & SSL (If applicable)

### 8. DNS Configuration
- [ ] A record for `@` (root domain) pointing to server IP
- [ ] A record for `www` pointing to server IP
- [ ] A record for `api` pointing to server IP
- [ ] A record for `ai` pointing to server IP
- [ ] DNS propagation complete (check at https://dnschecker.org)

### 9. SSL Certificates
- [ ] SSL certificate obtained (Let's Encrypt/Certbot)
- [ ] HTTPS enabled for all domains
- [ ] HTTP to HTTPS redirect configured
- [ ] SSL certificate auto-renewal configured
- [ ] All services accessible via HTTPS

**Test SSL:**
```bash
# Check SSL grade
https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```
- [ ] SSL A+ rating achieved

---

## Security Hardening

### 10. Security Checklist
- [ ] All passwords are strong and unique
- [ ] JWT secret is random and secure (32+ chars)
- [ ] Database uses SSL connection
- [ ] Redis uses password authentication
- [ ] CORS restricted to your domains only
- [ ] Rate limiting enabled
- [ ] Environment variables not in git
- [ ] `.env` files in `.gitignore`
- [ ] No sensitive data in logs
- [ ] Firewall configured (if VPS)
  - [ ] Port 80 (HTTP) open
  - [ ] Port 443 (HTTPS) open
  - [ ] Port 22 (SSH) restricted to your IP
  - [ ] All other ports closed

---

## Monitoring & Maintenance

### 11. Monitoring Setup
- [ ] Uptime monitoring configured (UptimeRobot/Better Uptime)
  - [ ] Frontend monitored
  - [ ] Backend API monitored
  - [ ] AI service monitored
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation setup (optional)
- [ ] Alerts configured for downtime
- [ ] Performance monitoring active

### 12. Backup Strategy
- [ ] Database backup script created
- [ ] Automated daily backups scheduled
- [ ] Backup storage location configured
- [ ] Backup retention policy set (30 days recommended)
- [ ] Backup restoration tested

**Setup Backup Cron:**
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-influencia.sh
```
- [ ] Cron job configured
- [ ] First backup successful
- [ ] Backup restoration tested

---

## Post-Deployment Testing

### 13. End-to-End Testing
- [ ] **User Registration Flow**
  - [ ] Brand can register
  - [ ] Creator can register
  - [ ] Email validation works
  
- [ ] **Authentication Flow**
  - [ ] Login successful
  - [ ] JWT token issued
  - [ ] Protected routes work
  - [ ] Logout works
  
- [ ] **Brand Features**
  - [ ] Create campaign
  - [ ] View creator recommendations
  - [ ] AI matching works
  - [ ] Analytics dashboard loads
  
- [ ] **Creator Features**
  - [ ] Complete profile
  - [ ] View available campaigns
  - [ ] Apply to campaigns
  - [ ] View analytics
  
- [ ] **AI Features**
  - [ ] Creator-campaign matching
  - [ ] Score calculation
  - [ ] Gemini insights generation
  - [ ] Response time acceptable

### 14. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] AI matching < 2 seconds
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Container resource usage normal

**Check Performance:**
```bash
# Check container stats
docker stats

# Load test API (optional)
# npm install -g artillery
# artillery quick --count 10 -n 20 https://api.yourdomain.com/health
```

---

## Documentation

### 15. Documentation Updated
- [ ] README.md updated with production URLs
- [ ] API documentation accessible
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Troubleshooting guide available

---

## Go-Live Checklist

### 16. Final Pre-Launch Checks
- [ ] All services running and healthy
- [ ] All tests passing
- [ ] Backups working
- [ ] Monitoring active
- [ ] SSL certificates valid
- [ ] Domain names resolving
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Error tracking working
- [ ] Support email configured

### 17. Launch Preparation
- [ ] Announcement prepared (if needed)
- [ ] Support channels ready
- [ ] Team notified
- [ ] Rollback plan documented
- [ ] Emergency contacts list ready

---

## Post-Launch

### 18. First 24 Hours
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review logs for issues
- [ ] Verify backup runs successfully
- [ ] Test all critical features
- [ ] Monitor resource usage
- [ ] Check uptime monitoring alerts

### 19. First Week
- [ ] Review weekly analytics
- [ ] Check for any error patterns
- [ ] Verify SSL auto-renewal setup
- [ ] Test backup restoration
- [ ] Review and optimize slow queries
- [ ] Plan scaling if needed
- [ ] Collect user feedback

---

## Maintenance Schedule

### Daily
- [ ] Check uptime monitoring
- [ ] Review error tracking dashboard
- [ ] Check service health endpoints

### Weekly
- [ ] Review logs for errors
- [ ] Check database size and growth
- [ ] Verify backups successful
- [ ] Review performance metrics
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Database cleanup and optimization
- [ ] Cost analysis and optimization
- [ ] Backup restoration test
- [ ] Update all dependencies
- [ ] Review and adjust scaling

---

## Rollback Plan

### In Case of Critical Issues
1. [ ] Stop deployment
2. [ ] Identify the issue
3. [ ] Rollback to previous version:
   ```bash
   # For Docker
   docker-compose -f docker-compose.prod.yml down
   git checkout <previous-commit>
   docker-compose -f docker-compose.prod.yml up -d
   
   # For Railway/Render
   # Use platform's rollback feature
   ```
4. [ ] Verify services working
5. [ ] Document the issue
6. [ ] Fix and redeploy

---

## Success Criteria

Your deployment is successful when:
- ✅ All services running and healthy
- ✅ All health checks passing
- ✅ Users can register and login
- ✅ AI matching working correctly
- ✅ HTTPS enabled on all domains
- ✅ Monitoring and alerts active
- ✅ Backups running automatically
- ✅ No critical errors in logs
- ✅ Performance within acceptable limits
- ✅ All security measures implemented

---

## 🎉 Deployment Complete!

Congratulations! Your Influencia platform is now live in production.

**Keep This Checklist** for future deployments and updates.

---

## Quick Reference

### Service URLs
- Frontend: https://yourdomain.com
- Backend API: https://api.yourdomain.com/v1
- AI Service: https://ai.yourdomain.com

### Health Checks
```bash
curl https://yourdomain.com/health
curl https://api.yourdomain.com/health
curl https://ai.yourdomain.com/health
```

### Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Emergency Stop
```bash
docker-compose -f docker-compose.prod.yml down
```

---

**Need Help?** Refer to [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) for detailed instructions.
