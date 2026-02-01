# Quick Start Script - Launch All Influencia Services
# This starts: ML API + Backend + Frontend in separate windows

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  INFLUENCIA - Quick Start" -ForegroundColor Cyan
Write-Host "  Starting ML API + Backend + Frontend" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "C:\Users\Suhelali\OneDrive\Desktop\Influencia"

# 1. Start ML API
Write-Host "[1/3] Starting ML API Server..." -ForegroundColor Yellow
$mlApiPath = Join-Path $rootPath "ai\inference"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$mlApiPath'; Write-Host 'ML API SERVER' -ForegroundColor Cyan; python start_server.py"
)
Write-Host "✓ ML API starting in new window (Port 5001)" -ForegroundColor Green
Start-Sleep -Seconds 3

# 2. Start Backend
Write-Host "[2/3] Starting Backend Server..." -ForegroundColor Yellow
$backendPath = Join-Path $rootPath "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host 'BACKEND SERVER' -ForegroundColor Cyan; npm run start:dev"
)
Write-Host "✓ Backend starting in new window (Port 3000)" -ForegroundColor Green
Start-Sleep -Seconds 5

# 3. Start Frontend
Write-Host "[3/3] Starting Frontend Server..." -ForegroundColor Yellow
$frontendPath = Join-Path $rootPath "frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; Write-Host 'FRONTEND SERVER' -ForegroundColor Cyan; npm run dev"
)
Write-Host "✓ Frontend starting in new window (Port 5174)" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  All Services Launching!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  ML API:    http://localhost:5001" -ForegroundColor Gray
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor Gray
Write-Host "  Frontend:  http://localhost:5174" -ForegroundColor Gray
Write-Host ""
Write-Host "API Documentation:" -ForegroundColor Yellow
Write-Host "  ML API Docs: http://localhost:5001/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Wait 10-15 seconds for all services to fully start..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open: http://localhost:5174" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop servers" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
