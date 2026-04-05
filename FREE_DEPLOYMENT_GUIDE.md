# 🚀 Influencia — Free Deployment Guide

> Deploy your **Backend (NestJS)**, **Frontend (React)**, and **AI/ML Service (Flask + PyTorch)** for **$0/month** using Render's free tier.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RENDER (Free Tier)                          │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │   Frontend    │   │   Backend    │   │   AI/ML Service      │    │
│  │  React+Nginx  │   │   NestJS     │   │   Flask+PyTorch      │    │
│  │  (Docker)     │──▶│  (Docker)    │──▶│   (Docker)           │    │
│  │  Port 10000   │   │  Port 3000   │   │   Port 5001          │    │
│  └──────────────┘   └──────┬───────┘   └──────────────────────┘    │
│                             │                                       │
│                      ┌──────┴───────┐                               │
│                      │ Render Redis  │                               │
│                      │ (Free KV)     │                               │
│                      └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     │  Neon PostgreSQL │  ← Already provisioned
                     │  (Free Tier)     │
                     └─────────────────┘
```

**Total Cost: $0/month** (all free tiers)

---

## 🎯 Prerequisites

| Requirement | Status |
|---|---|
| GitHub account | Needed for Render deployment |
| Render account | [Sign up free](https://dashboard.render.com/register) |
| Neon PostgreSQL | ✅ Already provisioned |
| Git installed locally | Needed to push code |

---

## Step 1: Push Code to GitHub

Your project has **no remote repository** configured. Let's fix that.

### 1.1 Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `Influencia`
3. Set to **Private** (has API keys in .env.example files)
4. **Don't** initialize with README (you already have one)
5. Click **Create repository**

### 1.2 Push Your Code

```powershell
cd "c:\Users\Suhelali\OneDrive\Desktop\Influencia"

# Make sure .env files are gitignored
echo "backend/.env" >> .gitignore
echo "ai/.env" >> .gitignore
echo "frontend/.env" >> .gitignore

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/Influencia.git
git add -A
git commit -m "Prepare for deployment - Docker fixes + render.yaml"
git branch -M main
git push -u origin main
```

> ⚠️ **Security**: Make sure `backend/.env`, `ai/.env`, `frontend/.env` are in `.gitignore`. Never push real credentials to GitHub.

---

## Step 2: Deploy on Render (Recommended — All Free)

### 🔥 Option A: One-Click Blueprint Deploy

1. Go to **[dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)**
2. Click **New Blueprint Instance**
3. Connect your **GitHub** account → select the `Influencia` repo
4. Render reads `render.yaml` and creates all 4 services automatically
5. Fill in the **sync: false** environment variables (see table below)
6. Click **Apply**

### ✋ Option B: Manual Deploy (Service by Service)

If the blueprint doesn't work, deploy each service manually:

---

#### 2.1 Deploy Redis (Do This First)

1. Dashboard → **New** → **Key Value**
2. Name: `influencia-redis`
3. Region: **Oregon**
4. Plan: **Free**
5. Click **Create**
6. 📝 Note the **Internal URL** (looks like `redis://red-xxxxx:6379`)

---

#### 2.2 Deploy Backend (NestJS)

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `influencia-backend`
   - **Region**: Oregon
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

4. **Environment Variables** (click "Add Environment Variable"):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_HOST` | `ep-morning-rain-anbmhzys-pooler.c-6.us-east-1.aws.neon.tech` |
| `DATABASE_PORT` | `5432` |
| `DATABASE_USER` | `neondb_owner` |
| `DATABASE_PASSWORD` | `npg_NvtcA1GIHFC0` |
| `DATABASE_NAME` | `neondb` |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | (generate a random 64-char string) |
| `JWT_EXPIRATION` | `7d` |
| `REDIS_HOST` | (from Redis service → Internal Host) |
| `REDIS_PORT` | (from Redis service → Port, usually `6379`) |
| `REDIS_PASSWORD` | (from Redis service → Password) |
| `REDIS_USERNAME` | (leave empty or `default`) |
| `REDIS_TLS` | `true` |
| `SESSION_TTL` | `604800` |
| `MAX_SESSIONS_PER_USER` | `5` |
| `CORS_ORIGIN` | `*` |
| `AI_SERVICE_URL` | (set after AI deploys: `https://influencia-ai.onrender.com`) |
| `ML_API_URL` | (same as AI_SERVICE_URL) |
| `FRONTEND_URL` | (set after frontend deploys) |

5. Click **Deploy Web Service**
6. 📝 Note the URL: `https://influencia-backend.onrender.com`

---

#### 2.3 Deploy AI/ML Service (Flask + PyTorch)

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `influencia-ai`
   - **Region**: Oregon
   - **Root Directory**: `ai`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

4. **Environment Variables**:

| Key | Value |
|---|---|
| `PORT` | `5001` |
| `GEMINI_API_KEY` | (your Google Gemini key from [aistudio.google.com](https://aistudio.google.com)) |
| `USE_LLM` | `true` |
| `PYTHONUNBUFFERED` | `1` |
| `CORS_ORIGINS` | `*` |

5. Click **Deploy Web Service**
6. 📝 Note the URL: `https://influencia-ai.onrender.com`

> ⚠️ **Memory Warning**: The AI service loads PyTorch + scikit-learn + sentence-transformers. Render free tier has 512MB RAM. If it crashes with OOM, see [Alternative: HuggingFace Spaces](#alternative-deploy-ai-on-huggingface-spaces-free) below.

---

#### 2.4 Deploy Frontend (React)

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `influencia-frontend`
   - **Region**: Oregon
   - **Root Directory**: `frontend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

4. **Environment Variables**:

| Key | Value |
|---|---|
| `PORT` | `10000` |
| `VITE_API_URL` | `https://influencia-backend.onrender.com/v1` |
| `VITE_AI_API_URL` | `https://influencia-ai.onrender.com` |

> 🔑 `VITE_API_URL` and `VITE_AI_API_URL` are **build-time** variables. Render passes env vars as Docker build args when the Dockerfile has matching `ARG` declarations. If the frontend shows "network error", redeploy after setting these.

5. Click **Deploy Web Service**
6. 📝 Your app is live at: `https://influencia-frontend.onrender.com` 🎉

---

#### 2.5 Update Cross-Service URLs

After all 4 services are running, update the URLs that reference each other:

| Service | Env Var | Set To |
|---|---|---|
| Backend | `AI_SERVICE_URL` | `https://influencia-ai.onrender.com` |
| Backend | `ML_API_URL` | `https://influencia-ai.onrender.com` |
| Backend | `FRONTEND_URL` | `https://influencia-frontend.onrender.com` |
| Backend | `CORS_ORIGIN` | `https://influencia-frontend.onrender.com` |
| Frontend | `VITE_API_URL` | `https://influencia-backend.onrender.com/v1` |
| Frontend | `VITE_AI_API_URL` | `https://influencia-ai.onrender.com` |

> After updating env vars, Render auto-redeploys. The frontend needs a **manual redeploy** because VITE_* vars are baked at build time.

---

## Step 3: Verify Deployment

### Health Checks

```bash
# Backend
curl https://influencia-backend.onrender.com/health

# AI Service
curl https://influencia-ai.onrender.com/health

# Frontend
curl https://influencia-frontend.onrender.com/health
```

### Test Login

1. Open `https://influencia-frontend.onrender.com`
2. Try logging in with a seeded user
3. Check browser DevTools → Network tab for API calls
4. Verify calls go to `influencia-backend.onrender.com`

---

## ⚠️ Render Free Tier Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| **Sleeps after 15 min idle** | First request takes ~30-60s | Expected for free tier; add a loading spinner |
| **512 MB RAM** | AI service may OOM with all models | Use HuggingFace Spaces for AI (see below) |
| **750 instance hours/month** | ~31 days for 1 service; 3 services = ~10 days each | Keep only backend+frontend running; deploy AI on HuggingFace |
| **No persistent disk** | ML model files regenerate on restart | Models are small (~10MB), retrained on startup |
| **Ephemeral filesystem** | Uploaded files lost on redeploy | Already using Neon DB for data |

---

## 🤗 Alternative: Deploy AI on HuggingFace Spaces (Free)

If the AI service crashes on Render due to memory limits, use HuggingFace Spaces:

### Setup

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces)
2. Click **Create new Space**
3. Settings:
   - **Name**: `influencia-ai`
   - **SDK**: Docker
   - **Hardware**: Free (CPU Basic — 2 vCPU, 16GB RAM!)
   - **Visibility**: Public
4. Clone and push your AI code:

```bash
cd ai
git init
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/influencia-ai
git add -A
git commit -m "Deploy AI service"
git push space main
```

5. Set secrets in HuggingFace:
   - `GEMINI_API_KEY`
   - `PORT` = `7860` (HuggingFace default)

6. Update Backend env var:
   - `AI_SERVICE_URL` = `https://YOUR_USERNAME-influencia-ai.hf.space`

> ✅ HuggingFace Spaces gives you **16GB RAM for free** — more than enough for PyTorch + all ML models.

---

## 🌐 Other Free Platforms (Alternatives)

| Platform | Best For | Free Tier | Docker Support | Link |
|---|---|---|---|---|
| **Render** ⭐ | All 3 services | 750 hrs/mo, 512MB | ✅ | [render.com](https://render.com) |
| **HuggingFace Spaces** | AI/ML service | 16GB RAM, unlimited | ✅ Docker SDK | [huggingface.co/spaces](https://huggingface.co/spaces) |
| **Vercel** | Frontend only | Unlimited | ❌ (Node only) | [vercel.com](https://vercel.com) |
| **Netlify** | Frontend only | 100GB bandwidth | ❌ | [netlify.com](https://netlify.com) |
| **Railway** | Backend + AI | $5 free credit/mo | ✅ | [railway.app](https://railway.app) |
| **Koyeb** | Backend | 1 free nano instance | ✅ | [koyeb.com](https://koyeb.com) |
| **Fly.io** | Backend | 3 shared VMs free | ✅ | [fly.io](https://fly.io) |
| **Cloudflare Pages** | Frontend only | Unlimited | ❌ | [pages.cloudflare.com](https://pages.cloudflare.com) |
| **Neon** | PostgreSQL | ✅ Already using | N/A | [neon.tech](https://neon.tech) |
| **Upstash** | Redis (alt) | 10K commands/day | N/A | [upstash.com](https://upstash.com) |

---

## 🏆 Recommended Free Stack (Best Performance)

| Service | Platform | Why |
|---|---|---|
| **Frontend** | **Vercel** or Render | Vercel has global CDN, instant deploys, no sleep |
| **Backend** | **Render** | Docker support, free PostgreSQL, easy setup |
| **AI/ML** | **HuggingFace Spaces** | 16GB RAM free — perfect for PyTorch |
| **Database** | **Neon** (current) | Already working, free tier |
| **Redis** | **Render Key Value** or Upstash | Render auto-connects; Upstash has serverless |

---

## 🔧 Deploying Frontend on Vercel (Alternative)

If you want the fastest frontend (global CDN, no sleep):

1. Go to [vercel.com](https://vercel.com) → Import Git Repository
2. Select `Influencia` repo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - `VITE_API_URL` = `https://influencia-backend.onrender.com/v1`
   - `VITE_AI_API_URL` = `https://influencia-ai.onrender.com`
5. Click **Deploy**

> Vercel auto-handles SPA routing, HTTPS, CDN caching, and preview deployments for every PR.

---

## 📁 Files Modified/Created for Deployment

| File | Action | Purpose |
|---|---|---|
| `render.yaml` | **Created** | Render blueprint for one-click deploy |
| `backend/Dockerfile` | **Fixed** | Added dns-fix.js for Neon DB, increased health check timeout |
| `frontend/Dockerfile` | **Fixed** | Removed start.sh dependency, inline envsubst |
| `ai/Dockerfile` | **Fixed** | Shell-form CMD for PORT var, timeout 300s, --preload |
| `backend/.dockerignore` | **Created** | Reduces build context (keeps dns-fix.js!) |
| `frontend/.dockerignore` | **Created** | Reduces build context |
| `ai/.dockerignore` | **Created** | Reduces build context |
| `frontend/src/api/client.ts` | **Fixed** | Uses `VITE_API_URL` env var instead of hardcoded `/v1` |
| `ai/api_server_v2.py` | **Fixed** | CORS reads from `CORS_ORIGINS` env var |

---

## 🔄 Quick Deploy Checklist

- [ ] Create GitHub repo and push code
- [ ] Sign up on [render.com](https://render.com)
- [ ] Deploy Redis (Key Value) first
- [ ] Deploy Backend with all env vars
- [ ] Deploy AI service
- [ ] Deploy Frontend with backend/AI URLs
- [ ] Update cross-service URLs (Step 2.5)
- [ ] Test health endpoints
- [ ] Test login flow
- [ ] 🎉 Share your live URL!
