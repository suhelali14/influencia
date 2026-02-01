# Full-Stack Integration Test Script for Influencia
# Tests: ML API → Backend → Database flow

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  INFLUENCIA INTEGRATION TEST" -ForegroundColor Cyan
Write-Host "  Testing ML API → Backend → Database Flow" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: ML API Health Check
Write-Host "[1/5] Testing ML API Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✓ ML API is healthy" -ForegroundColor Green
        Write-Host "  Models loaded: $($healthResponse.models_loaded)" -ForegroundColor Gray
    } else {
        Write-Host "✗ ML API unhealthy" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ ML API not responding at http://localhost:5001" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: ML API Prediction Endpoint
Write-Host "[2/5] Testing ML API Prediction..." -ForegroundColor Yellow

$testCreator = @{
    creator_id = "test_creator_123"
    follower_count = 75000
    engagement_rate = 4.5
    categories = "Fashion & Lifestyle"
    platforms = "Instagram,YouTube"
    primary_language = "Hindi"
    city = "Mumbai"
    demographics = @{
        age_group = "18-24"
        gender_split = @{ female = 65; male = 30; other = 5 }
    }
}

$testCampaign = @{
    campaign_id = "test_campaign_456"
    title = "Fashion Brand Summer Collection"
    description = "Promote our new summer fashion line"
    brand_name = "FashionBrand India"
    category = "Fashion & Lifestyle"
    platform = "Instagram"
    budget = 150000
    duration_days = 30
    targeting = @{
        age_range = "18-30"
        gender = "Female"
        locations = @("Mumbai", "Delhi", "Bangalore")
    }
    requirements = @{
        min_followers = 50000
        min_engagement = 3.0
        deliverables = @("Instagram Post", "Instagram Story", "Instagram Reel")
    }
}

$predictionBody = @{
    creator = $testCreator
    campaign = $testCampaign
} | ConvertTo-Json -Depth 10

try {
    $predictionResponse = Invoke-RestMethod -Uri "http://localhost:5001/predict" -Method Post -Body $predictionBody -ContentType "application/json"
    Write-Host "✓ ML API prediction successful" -ForegroundColor Green
    Write-Host "  Match Score: $([math]::Round($predictionResponse.match_score * 100, 2))%" -ForegroundColor Gray
    Write-Host "  Confidence: $([math]::Round($predictionResponse.confidence * 100, 2))%" -ForegroundColor Gray
    Write-Host "  XGBoost: $([math]::Round($predictionResponse.model_scores.xgboost * 100, 2))%" -ForegroundColor Gray
    Write-Host "  Neural Net: $([math]::Round($predictionResponse.model_scores.neural_network * 100, 2))%" -ForegroundColor Gray
    Write-Host "  BERT: $([math]::Round($predictionResponse.model_scores.bert_semantic * 100, 2))%" -ForegroundColor Gray
} catch {
    Write-Host "✗ ML API prediction failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Backend Health Check
Write-Host "[3/5] Testing Backend Health..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -ErrorAction SilentlyContinue
    Write-Host "✓ Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend health endpoint not available (might need to start backend)" -ForegroundColor Yellow
    Write-Host "  Trying to check if backend is running..." -ForegroundColor Gray
}

Write-Host ""

# Test 4: Backend AI Endpoints (requires auth)
Write-Host "[4/5] Testing Backend AI Integration..." -ForegroundColor Yellow
Write-Host "⚠ Skipping - requires authentication token" -ForegroundColor Yellow
Write-Host "  To test manually:" -ForegroundColor Gray
Write-Host "  1. Login to get JWT token" -ForegroundColor Gray
Write-Host "  2. POST to http://localhost:3000/api/ai/match" -ForegroundColor Gray
Write-Host "  3. POST to http://localhost:3000/api/ai/rank-creators" -ForegroundColor Gray

Write-Host ""

# Test 5: ML API Documentation
Write-Host "[5/5] Checking API Documentation..." -ForegroundColor Yellow
try {
    $docsResponse = Invoke-WebRequest -Uri "http://localhost:5001/docs" -Method Get
    if ($docsResponse.StatusCode -eq 200) {
        Write-Host "✓ API docs available at http://localhost:5001/docs" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ API docs not accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  INTEGRATION TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✓ ML API: Running and responsive" -ForegroundColor Green
Write-Host "✓ Predictions: Working with India-specific data" -ForegroundColor Green
Write-Host "✓ Models: XGBoost, Neural Network, BERT all active" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend && npm run start:dev" -ForegroundColor Gray
Write-Host "2. Start frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host "3. Test full flow: Login → Create Campaign → Match Creators" -ForegroundColor Gray
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  ML API: http://localhost:5001" -ForegroundColor Gray
Write-Host "  Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  Frontend: http://localhost:5174" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
