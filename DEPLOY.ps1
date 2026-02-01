# Quick Deploy Script for Influencia Platform (Windows PowerShell)
# This script helps you deploy quickly to production

Write-Host "🚀 Influencia Quick Deploy Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env.production and fill in your values."
    Write-Host ""
    Write-Host "Run: Copy-Item .env.example .env.production"
    Write-Host "Then edit .env.production with your credentials"
    exit 1
}

Write-Host "✅ Found .env.production" -ForegroundColor Green
Write-Host ""

# Load environment variables
Get-Content .env.production | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

# Check required variables
$RequiredVars = @("DATABASE_URL", "REDIS_HOST", "JWT_SECRET", "GEMINI_API_KEY")
$MissingVars = @()

foreach ($var in $RequiredVars) {
    if (-not (Test-Path "env:$var") -or [string]::IsNullOrEmpty((Get-Item "env:$var").Value)) {
        $MissingVars += $var
    }
}

if ($MissingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $MissingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please set these in .env.production"
    exit 1
}

Write-Host "✅ All required environment variables present" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "❌ Error: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again."
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Build and deploy
Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

$services = docker-compose -f docker-compose.prod.yml ps

# Check backend
if ($services -match "influencia_backend.*Up") {
    Write-Host "✅ Backend is running" -ForegroundColor Green
} else {
    Write-Host "❌ Backend failed to start" -ForegroundColor Red
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
}

# Check AI service
if ($services -match "influencia_ai.*Up") {
    Write-Host "✅ AI service is running" -ForegroundColor Green
} else {
    Write-Host "❌ AI service failed to start" -ForegroundColor Red
    docker-compose -f docker-compose.prod.yml logs ai
    exit 1
}

# Check frontend
if ($services -match "influencia_frontend.*Up") {
    Write-Host "✅ Frontend is running" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend failed to start" -ForegroundColor Red
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""
Write-Host "Your services are now running:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:80"
Write-Host "  Backend:   http://localhost:3000"
Write-Host "  AI:        http://localhost:5001"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run database migrations:"
Write-Host "     docker exec -it influencia_backend npm run migration:run"
Write-Host ""
Write-Host "  2. Check logs:"
Write-Host "     docker-compose -f docker-compose.prod.yml logs -f"
Write-Host ""
Write-Host "  3. Test health endpoints:"
Write-Host "     curl http://localhost:3000/health"
Write-Host "     curl http://localhost:5001/health"
Write-Host ""
Write-Host "For more information, see COMPLETE_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
