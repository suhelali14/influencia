# 🤖 Gemini AI Integration - Setup & Testing Guide

## Problem & Solution

**Problem**: When clicking "Generate AI Report", the system was calling `/api/analyze` (ML predictions only) instead of `/api/generate-creator-report` (Gemini AI).

**Root Cause**: The GEMINI_API_KEY environment variable was not set, so the system was using fallback reports.

---

## ✅ Solution Steps

### Step 1: Get Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### Step 2: Set Environment Variable

**Option A - Temporary (current session only):**
```powershell
$env:GEMINI_API_KEY = "YOUR_API_KEY_HERE"
```

**Option B - Permanent (recommended):**
```powershell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'YOUR_API_KEY_HERE', 'User')
```

After setting permanently, **restart PowerShell** for changes to take effect.

### Step 3: Start AI Microservice

```powershell
# Use the helper script (recommended)
.\START_AI_SERVICE.ps1

# OR manually
cd ai
python api_server.py 5001
```

The script will:
- ✅ Check if GEMINI_API_KEY is set
- ✅ Show API key preview (first 10 chars)
- ✅ Start service on port 5001
- ⚠️ Warn you if API key is missing

### Step 4: Verify Setup

**Check health endpoint:**
```
http://localhost:5001/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "AI/ML Microservice",
  "models_loaded": true
}
```

### Step 5: Test in Frontend

1. Login as a creator
2. Go to Collaborations → View Details
3. Click "AI Analysis" tab
4. Click "Generate AI Analysis Report" button
5. Wait 10-30 seconds (Gemini API call takes time)
6. Report should display with rich Gemini-generated content

---

## 🔍 How to Verify Gemini is Working

### Check Backend Logs:
```
🤖 Generating AI report for collaboration xxx
🌐 Calling AI microservice at http://localhost:5001/api/generate-creator-report
```

### Check AI Service Logs:
```
🎨 Generating creator-focused report for xxx
🎨 Generating creator-focused AI report...
🤖 Calling Gemini API...
✅ Gemini API call successful!
✅ Creator-focused AI report generated
```

### If API Key is Missing:
```
⚠️  GEMINI_API_KEY not set - using fallback report
💡 To use real Gemini AI, set the GEMINI_API_KEY environment variable
```

---

## 🎯 What Changed

### 1. AI Service Improvements
- **File**: `ai/gemini_report.py`
- Added better logging to show when Gemini is called
- Clear warnings when API key is missing
- Shows success message when Gemini responds

### 2. Backend Service
- **File**: `backend/src/creators/creators.service.ts`
- Added logging to show AI microservice URL being called
- Calls `/api/generate-creator-report` endpoint (not `/api/analyze`)

### 3. Frontend UI
- **File**: `frontend/src/pages/Creator/CollaborationDetail.tsx`
- Changed "Download PDF" to "Regenerate Report" button
- Button now triggers Gemini report generation
- Shows loading animation with spinning Zap icon
- Beautiful display of Gemini-generated reports

---

## 📊 API Endpoints

| Endpoint | Purpose | Uses Gemini? |
|----------|---------|--------------|
| `/api/analyze` | Quick ML predictions | ❌ No (ML only) |
| `/api/generate-report` | Brand-focused Gemini report | ✅ Yes |
| `/api/generate-creator-report` | Creator-focused Gemini report | ✅ Yes |
| `/api/match-score` | Calculate match score only | ❌ No (ML only) |

---

## 🐛 Troubleshooting

### Issue: "Fallback report" being used

**Solution**: Set GEMINI_API_KEY environment variable and restart AI service

### Issue: AI service not starting

**Check**:
- Python dependencies installed: `pip install -r ai/requirements.txt`
- Port 5001 is not in use
- Models exist in `ai/models/` directory

### Issue: Backend can't reach AI service

**Check**:
- AI service is running on port 5001
- Backend environment variable: `AI_SERVICE_URL=http://localhost:5001`
- No firewall blocking localhost connections

### Issue: Gemini API error

**Check**:
- API key is valid and not expired
- You have quota remaining in Google Cloud Console
- Check AI service logs for specific error message

---

## 🚀 Testing Flow

1. **Start Services**:
   ```powershell
   # Terminal 1 - Backend
   npx nest start --watch
   
   # Terminal 2 - AI Service
   .\START_AI_SERVICE.ps1
   
   # Terminal 3 - Frontend
   cd frontend
   npm run dev
   ```

2. **Test Creator Report**:
   - Login as creator
   - View a collaboration detail
   - Click "Generate AI Analysis Report"
   - Wait for Gemini to generate (10-30 seconds)
   - See personalized AI report with sections:
     * Executive Summary
     * Why This Is a Great Fit
     * Growth Opportunities
     * Financial Analysis
     * Brand Compatibility
     * Negotiation Points
     * Strategic Recommendations
     * Decision Framework

3. **Verify in Logs**:
   - Backend: Should show "Calling AI microservice"
   - AI Service: Should show "Calling Gemini API" and "Gemini API call successful!"

---

## 💡 Tips

1. **API Key Security**: Never commit API keys to git. Use environment variables only.

2. **Rate Limits**: Gemini API has rate limits. Don't generate reports too frequently.

3. **Cost**: Check Google AI Studio for pricing. Free tier includes generous quota.

4. **Fallback**: System works without API key (uses fallback reports) but won't have real AI insights.

5. **Caching**: Reports are saved to database after generation, so you don't need to regenerate unless you want fresh insights.

---

## 📝 Next Steps

1. ✅ Set GEMINI_API_KEY
2. ✅ Start AI service with `START_AI_SERVICE.ps1`
3. ✅ Test report generation from frontend
4. ✅ Verify logs show Gemini API calls
5. ⏳ Add Gemini insights to dashboard
6. ⏳ Add PDF export functionality
7. ⏳ Add email notifications with AI insights

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ AI service logs show "Calling Gemini API..."
- ✅ AI service logs show "Gemini API call successful!"
- ✅ Frontend displays rich, personalized AI-generated report
- ✅ Report includes multiple detailed sections (not just fallback text)
- ✅ Report is saved to database (ai_analysis_reports table)
- ✅ Can click "Regenerate Report" to get fresh Gemini insights
