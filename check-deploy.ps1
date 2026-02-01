# Pre-Deployment Check Script for Influencia
# Run this before deploying to ensure everything is configured

Write-Host "`n🔍 Influencia Pre-Deployment Check" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

$allChecks = $true

# Check 1: .env.production exists
Write-Host "[1/8] Checking for .env.production file..." -NoNewline
if (Test-Path ".env.production") {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "      Missing .env.production file!" -ForegroundColor Red
    Write-Host "      Run: Copy-Item .env.example .env.production" -ForegroundColor Yellow
    $allChecks = $false
}

# Load env vars if file exists
if (Test-Path ".env.production") {
    Get-Content .env.production | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value -ErrorAction SilentlyContinue
        }
    }

    # Check 2: Required environment variables
    Write-Host "[2/8] Checking required environment variables..." -NoNewline
    $requiredVars = @{
        "DATABASE_URL" = "PostgreSQL database URL"
        "REDIS_HOST" = "Redis host"
        "JWT_SECRET" = "JWT secret key"
        "GEMINI_API_KEY" = "Gemini API key"
    }
    
    $missingVars = @()
    foreach ($var in $requiredVars.Keys) {
        $value = [Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrWhiteSpace($value) -or $value -like "*your-*" -or $value -like "*example*") {
            $missingVars += "$var ($($requiredVars[$var]))"
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "      Missing or invalid variables:" -ForegroundColor Red
        $missingVars | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
        $allChecks = $false
    }

    # Check 3: JWT Secret strength
    Write-Host "[3/8] Checking JWT secret strength..." -NoNewline
    $jwtSecret = [Environment]::GetEnvironmentVariable("JWT_SECRET")
    if ($jwtSecret -and $jwtSecret.Length -ge 32 -and $jwtSecret -notlike "*your-*" -and $jwtSecret -notlike "*example*") {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        Write-Host "      JWT secret should be at least 32 characters" -ForegroundColor Yellow
        Write-Host "      Generate with: [Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))" -ForegroundColor Yellow
        $allChecks = $false
    }

    # Check 4: Database URL format
    Write-Host "[4/8] Checking database URL format..." -NoNewline
    $dbUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL")
    if ($dbUrl -and $dbUrl -match "^postgresql://.+@.+/.+") {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "      Invalid DATABASE_URL format" -ForegroundColor Red
        Write-Host "      Should be: postgresql://user:password@host:5432/database?sslmode=require" -ForegroundColor Yellow
        $allChecks = $false
    }
}

# Check 5: Docker availability
Write-Host "[5/8] Checking Docker..." -NoNewline
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
        
        # Check if Docker is running
        Write-Host "[6/8] Checking Docker daemon..." -NoNewline
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌" -ForegroundColor Red
            Write-Host "      Docker is installed but not running" -ForegroundColor Red
            Write-Host "      Start Docker Desktop" -ForegroundColor Yellow
            $allChecks = $false
        }
    } else {
        Write-Host " ❌" -ForegroundColor Red
        $allChecks = $false
    }
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "      Docker is not installed" -ForegroundColor Red
    Write-Host "      Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    $allChecks = $false
}

# Check 7: Docker Compose availability
Write-Host "[7/8] Checking Docker Compose..." -NoNewline
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        $allChecks = $false
    }
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "      Docker Compose is not installed" -ForegroundColor Red
    $allChecks = $false
}

# Check 8: Required files exist
Write-Host "[8/8] Checking deployment files..." -NoNewline
$requiredFiles = @(
    "docker-compose.prod.yml",
    "backend/Dockerfile",
    "ai/Dockerfile",
    "frontend/Dockerfile"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "      Missing files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
    $allChecks = $false
}

# Final result
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan

if ($allChecks) {
    Write-Host "✅ All checks passed! Ready to deploy!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Run deployment with:" -ForegroundColor Cyan
    Write-Host "  .\DEPLOY.ps1`n" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Some checks failed. Please fix issues above." -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "Quick fixes:" -ForegroundColor Yellow
    Write-Host "  1. Copy environment template:" -ForegroundColor White
    Write-Host "     Copy-Item .env.example .env.production" -ForegroundColor Gray
    Write-Host "  2. Edit with your credentials:" -ForegroundColor White
    Write-Host "     notepad .env.production" -ForegroundColor Gray
    Write-Host "  3. Get free services from:" -ForegroundColor White
    Write-Host "     - Database: https://neon.tech" -ForegroundColor Gray
    Write-Host "     - Redis: https://upstash.com" -ForegroundColor Gray
    Write-Host "     - AI: https://makersuite.google.com`n" -ForegroundColor Gray
    exit 1
}
