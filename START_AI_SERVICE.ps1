# Start AI Service with Gemini API Key
# PowerShell script to start the AI microservice

Write-Host "🚀 Starting AI Microservice with Gemini Integration" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Check if Gemini API Key is set
$geminiKey = $env:GEMINI_API_KEY

if (-not $geminiKey) {
    Write-Host "" 
    Write-Host "⚠️  WARNING: GEMINI_API_KEY environment variable is not set!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To use real Gemini AI reports, you need to:" -ForegroundColor White
    Write-Host "  1. Get a Gemini API key from: https://makersuite.google.com/app/apikey" -ForegroundColor White
    Write-Host "  2. Set it as an environment variable:" -ForegroundColor White
    Write-Host ""
    Write-Host "     Option A - Set for this session only:" -ForegroundColor Cyan
    Write-Host "     `$env:GEMINI_API_KEY = 'your-api-key-here'" -ForegroundColor Green
    Write-Host ""
    Write-Host "     Option B - Set permanently (recommended):" -ForegroundColor Cyan
    Write-Host "     [System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'your-api-key-here', 'User')" -ForegroundColor Green
    Write-Host ""
    Write-Host "  3. Restart this script" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Note: Without the API key, fallback reports will be used (no real AI generation)" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Gray
    Write-Host ""
    
    $continue = Read-Host "Continue without Gemini API key? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "❌ Exiting..." -ForegroundColor Red
        exit
    }
} else {
    Write-Host "✅ GEMINI_API_KEY found!" -ForegroundColor Green
    Write-Host "   Key preview: $($geminiKey.Substring(0, [Math]::Min(10, $geminiKey.Length)))..." -ForegroundColor Gray
    Write-Host ""
}

# Change to ai directory
Set-Location -Path "ai"

Write-Host "🐍 Starting Python AI service on port 5001..." -ForegroundColor Cyan
Write-Host "📊 API Endpoints:" -ForegroundColor White
Write-Host "   - Health Check:    http://localhost:5001/health" -ForegroundColor Gray
Write-Host "   - Analyze:         http://localhost:5001/api/analyze" -ForegroundColor Gray
Write-Host "   - Creator Report:  http://localhost:5001/api/generate-creator-report" -ForegroundColor Gray
Write-Host "   - Brand Report:    http://localhost:5001/api/generate-report" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host ""

# Start the AI service
python api_server.py 5001
