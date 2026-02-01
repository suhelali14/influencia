# Start All Services Script
# Run this to start Backend, Frontend, and AI Microservice

Write-Host "🚀 Starting Influencia Platform Services..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install Python 3.14+" -ForegroundColor Red
    exit 1
}

# Check if Node is available
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Python and Node.js found" -ForegroundColor Green
Write-Host ""

# Start AI Microservice
Write-Host "1️⃣  Starting AI Microservice on port 5001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai; python api_server.py 5001"
Start-Sleep -Seconds 3

# Start Backend
Write-Host "2️⃣  Starting Backend (NestJS) on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npx nest start --watch"
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "3️⃣  Starting Frontend (Vite) on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   🤖 AI Microservice: http://localhost:5001/health" -ForegroundColor White
Write-Host "   🔧 Backend API: http://localhost:3000/v1" -ForegroundColor White
Write-Host "   🌐 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "💡 Login with:" -ForegroundColor Yellow
Write-Host "   Email: suhelalipakjade@gmail.com" -ForegroundColor White
Write-Host "   Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open frontend in browser..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "http://localhost:5173"
