# GitHub Issues - Excel Add-in Remaining Work

**Generated:** 2025-01-25
**Status:** Ready to create in GitHub

---

## 🔴 P0: Critical (Blocks Launch)

### Issue #1: Test Walk Phase Features on Production
**Priority:** P0 (Critical)
**Labels:** `testing`, `walk-phase`, `pricing`
**Estimate:** 45 minutes

**Description:**
Manually test all Walk phase features to verify pricing protection works correctly before marketing push.

**Testing Scenarios:**
- [ ] Free tier user sees tier gate (purple gradient paywall)
- [ ] Paid tier user sees historical data features
- [ ] Historical data fetches correctly (past year, past month)
- [ ] Rate limiting works (1 fetch/hour per commodity)
- [ ] Bulk fetch reduces API usage
- [ ] Analytics events fire correctly
- [ ] Upgrade button opens pricing page

**Test Guide:**
Follow `WALK_PHASE_TESTING_GUIDE.md` for complete testing scenarios.

**Success Criteria:**
- All 6 test scenarios pass
- No pricing bypass loopholes found
- Analytics tracking verified in Plausible dashboard

**Blocker:** This must pass before AppSource submission and marketing.

---

## 🟡 P1: High Priority (Launch Requirements)

### Issue #2: Take AppSource Screenshots
**Priority:** P1 (High)
**Labels:** `appsource`, `documentation`, `marketing`
**Estimate:** 15 minutes

**Description:**
Capture 5 required screenshots for Microsoft AppSource submission.

**Requirements:**
- Resolution: 1366x768 (AppSource requirement)
- Format: PNG or JPEG
- Quality: High-res, clear text

**Screenshots Needed:**
1. Welcome modal on first run
2. Settings with API key and usage counter
3. Fetch Prices action with commodities selected
4. Data sheet populated with prices
5. Historical Data section with tier gate (free user view)

**Tools:**
- Windows: Snipping Tool (Win+Shift+S)
- Mac: Screenshot (Cmd+Shift+4)

**Save Location:** `/screenshots/` directory in repo

**Acceptance Criteria:**
- 5 screenshots saved
- All at 1366x768 resolution
- Clear, professional appearance
- Added to git repository

---

### Issue #3: Record Demo Video
**Priority:** P1 (High)
**Labels:** `appsource`, `documentation`, `marketing`
**Estimate:** 30 minutes

**Description:**
Record 60-90 second demo video for AppSource submission.

**Script:**
Follow script in `APPSOURCE_SUBMISSION_GUIDE.md` lines 109-142

**Timeline:**
- 0:00-0:10: Hook (Excel one-click comparison)
- 0:10-0:20: Installation from AppSource
- 0:20-0:35: API key setup
- 0:35-0:50: Fetch prices
- 0:50-1:05: Convert to MBtu
- 1:05-1:15: Closing with free tier callout

**Tools:**
- OBS Studio (free): https://obsproject.com
- Loom: https://loom.com

**Deliverables:**
- MP4 video file (1280x720 or higher)
- Uploaded to YouTube (unlisted) or Vimeo
- Link added to `APPSOURCE_SUBMISSION_GUIDE.md`

**Acceptance Criteria:**
- Video is 60-90 seconds
- All key features demonstrated
- Clear narration explaining value
- Professional quality

---

### Issue #4: Submit to Microsoft AppSource
**Priority:** P1 (High)
**Labels:** `appsource`, `distribution`
**Estimate:** 20 minutes

**Description:**
Submit Excel add-in to Microsoft AppSource for distribution.

**Prerequisites:**
- Issue #2 complete (screenshots)
- Issue #3 complete (demo video)

**Steps:**
1. Sign in to Partner Center: https://partner.microsoft.com/dashboard
2. Create new Office Add-in offer
3. Upload manifest.xml
4. Upload 5 screenshots
5. Add demo video link
6. Fill in descriptions (copy from `APPSOURCE_SUBMISSION_GUIDE.md`)
7. Submit for validation

**Expected Review Time:** 5-10 business days

**Acceptance Criteria:**
- Submission completed
- Validation passes (no errors)
- Status: "In review"

**Blocker:** Requires issues #2 and #3 to be complete first.

---

## 🟢 P2: Medium Priority (Post-Launch)

### Issue #5: Marketing Push After AppSource Approval
**Priority:** P2 (Medium)
**Labels:** `marketing`, `growth`
**Estimate:** 1 hour

**Description:**
Launch marketing campaign after AppSource approval.

**Channels:**

**1. LinkedIn Post:**
```
🚀 Just launched: Energy Price Comparison for Excel

Compare oil & gas prices in Excel with one click:
✅ Real-time Brent, WTI, Natural Gas prices
✅ Convert to $/MBtu for apples-to-apples comparison
✅ 20+ years of historical data (paid tiers)

Perfect for energy analysts, traders, and procurement teams.

Free tier: 1,000 API requests/month
Install: [AppSource Link]

#Excel #EnergyTrading #CommodityPrices #OilAndGas
```

**2. Email Campaign:**
- Segment: Users who made API call in last 30 days
- Subject: "New: Excel Add-in for Energy Prices 📊"
- Template in `APPSOURCE_SUBMISSION_GUIDE.md` lines 335-363

**3. Blog Post:**
- Title: "Introducing: Energy Price Comparison for Excel"
- URL: /blog/excel-addin-launch
- SEO keywords: excel energy prices, commodity excel plugin

**Success Metrics:**
- LinkedIn: 500+ impressions, 50+ clicks
- Email: 25%+ open rate, 10%+ click rate
- 50-100 AppSource installs in first week

**Blocker:** Wait for AppSource approval (issue #4)

---

### Issue #6: Monitor Analytics and Conversion Funnel
**Priority:** P2 (Medium)
**Labels:** `analytics`, `monitoring`
**Estimate:** 15 min/day for 7 days

**Description:**
Track key metrics for first 7 days after launch.

**Metrics to Monitor:**

**Daily:**
- Add-in opens (Plausible)
- Paywall impressions
- Upgrade button clicks
- Historical data fetches
- Error rate

**Weekly:**
- Free → Paid conversion rate
- Average requests per user
- Churn rate
- MRR from Excel users

**Dashboard:** https://plausible.io/excel.oilpriceapi.com

**Red Flags:**
- 🚩 Conversion rate < 5% → Paywall messaging unclear
- 🚩 Error rate > 5% → Backend issues
- 🚩 Churn rate > 20% → Value proposition weak

**Acceptance Criteria:**
- 7 days of metrics tracked
- Conversion funnel documented
- Any issues identified and new GitHub issues created

---

### Issue #7: Optimize Historical Data Endpoint (Backend)
**Priority:** P2 (Medium)
**Labels:** `backend`, `api`, `enhancement`
**Estimate:** 2 hours

**Description:**
Current `/v1/prices/past_year` returns intraday prices (too much data). Create daily aggregate endpoint for better UX.

**Problem:**
- Current endpoint returns 1000+ intraday data points
- Users want daily close prices, not every tick
- Slower response times, harder to visualize

**Solution:**
Create new endpoint: `/v1/prices/past_year_daily?by_code=BRENT_CRUDE_USD`

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "prices": [
      {
        "date": "2024-01-25",
        "open": 82.50,
        "high": 83.20,
        "low": 82.10,
        "close": 82.85,
        "currency": "USD",
        "code": "BRENT_CRUDE_USD"
      }
    ]
  }
}
```

**Benefits:**
- ~365 data points instead of 1000+
- Faster API response
- Easier charting in Excel
- Standard OHLC format

**Acceptance Criteria:**
- New endpoint created in backend
- Excel add-in updated to use new endpoint
- Tests passing
- Documentation updated

---

### Issue #8: Add Feature Flags to /users/me Endpoint
**Priority:** P2 (Medium)
**Labels:** `backend`, `api`, `enhancement`
**Estimate:** 1 hour

**Description:**
Currently, Excel add-in infers feature flags from `plan` field. Backend should provide explicit feature flags.

**Current Response:**
```json
{
  "id": "...",
  "email": "...",
  "plan": "exploration",
  "request_limit": 10000
}
```

**Desired Response:**
```json
{
  "id": "...",
  "email": "...",
  "plan": "exploration",
  "request_limit": 10000,
  "features": {
    "canAccessHistorical": true,
    "canAccessFutures": false,
    "canUseWebhooks": false,
    "canAccessDrillingIntelligence": false
  }
}
```

**Backend Changes:**
- Add `features` hash to `/users/me` serializer
- Use existing `User` model methods: `can_access_historical?`, etc.

**Excel Changes:**
- Simplify `getUserTier()` to use `user.features` directly
- Remove plan inference logic

**Acceptance Criteria:**
- Backend returns feature flags
- Excel add-in uses new format
- Backward compatible (falls back to plan inference if features missing)

---

## 🔵 P3: Low Priority (Nice to Have)

### Issue #9: Implement Rate Limiting on Historical Endpoints
**Priority:** P3 (Low)
**Labels:** `backend`, `security`, `pricing`
**Estimate:** 3 hours

**Description:**
Currently, rate limiting is not enforced on historical endpoints. Users can fetch unlimited historical data.

**Current Behavior:**
- User can fetch `/v1/prices/past_year` repeatedly with no throttle
- No tracking of last fetch time per commodity

**Desired Behavior:**
- Limit: 1 fetch per commodity per hour
- Track last fetch in Redis: `historical:BRENT_CRUDE_USD:user_id:last_fetch`
- Return 429 with `next_available_at` timestamp

**Response on Rate Limit:**
```json
{
  "error": "Rate limit exceeded",
  "message": "You can fetch historical data for each commodity once per hour",
  "next_available_at": "2025-01-25T12:00:00Z",
  "upgrade_required": false
}
```

**Implementation:**
- Add `RateLimitPolicy::Historical` class
- Check last fetch time before query
- Return 429 if < 1 hour since last fetch
- Excel add-in already handles 429 responses

**Acceptance Criteria:**
- Rate limiting enforced
- Redis tracks last fetch times
- 429 responses include next_available_at
- Excel shows "Available in X minutes" message

---

### Issue #10: Add Countdown Timer for Rate Limits
**Priority:** P3 (Low)
**Labels:** `excel-addin`, `ux`, `enhancement`
**Estimate:** 1 hour

**Description:**
When user hits rate limit, show countdown: "Available in 47 minutes" instead of generic error.

**Current UX:**
```
Error: You can fetch historical data for each commodity once per hour
```

**Desired UX:**
```
⏱️ Rate limit reached

You can fetch BRENT_CRUDE_USD historical data again in 47 minutes.

Need data now? Upgrade to Production tier for higher limits.
[Upgrade Now]
```

**Implementation:**
- Parse `next_available_at` from 429 response
- Calculate minutes remaining
- Show countdown in error message
- Add "Upgrade Now" button if free tier

**Acceptance Criteria:**
- Countdown displays correctly
- Updates every minute (optional)
- Upgrade button appears for free users
- Analytics tracks "Rate Limit Countdown Shown"

---

### Issue #11: Custom Excel Functions (UDFs)
**Priority:** P3 (Low)
**Labels:** `excel-addin`, `feature`, `run-phase`
**Estimate:** 1 week

**Description:**
Add custom Excel functions for power users: `=OILPRICE("BRENT")`, `=OILHISTORY("WTI", 365)`

**Examples:**
```excel
=OILPRICE("BRENT")           → 82.30
=OILPRICE("WTI", "EUR")      → 74.50 (converted)
=OILHISTORY("NATGAS", 30)    → Array of 30 daily prices
=OILCONVERT(100, "barrel", "MBtu")  → 17.26
```

**Benefits:**
- Power users love Excel functions
- No UI interaction needed
- Formulas update automatically
- Professional use case (financial models)

**Implementation:**
- Use Office.js Custom Functions API
- Register functions in manifest.xml
- Cache results to minimize API calls
- Add tier checking for historical functions

**Acceptance Criteria:**
- 4+ custom functions working
- Auto-refresh on workbook open
- Tier restrictions enforced
- Documentation for each function

---

## 📊 Summary

**Total Issues:** 11

**By Priority:**
- 🔴 P0 (Critical): 1 issue - Must do before launch
- 🟡 P1 (High): 4 issues - Launch requirements
- 🟢 P2 (Medium): 4 issues - Post-launch improvements
- 🔵 P3 (Low): 2 issues - Nice to have

**Estimated Time:**
- P0: 45 min
- P1: 1 hour 5 min (plus AppSource review wait)
- P2: ~10 hours
- P3: ~45 hours

**Critical Path to Launch:**
1. Issue #1: Test Walk Phase (45 min)
2. Issue #2: Screenshots (15 min)
3. Issue #3: Demo Video (30 min)
4. Issue #4: AppSource Submission (20 min)
5. Wait 5-10 business days for approval
6. Issue #5: Marketing Push (1 hour)

**Total Time to Launch:** ~2 hours + 5-10 day wait

---

## 🚀 Next Actions

1. Create these issues in GitHub: https://github.com/OilpriceAPI/excel-energy-addin/issues/new
2. Assign priorities using labels: `P0-critical`, `P1-high`, `P2-medium`, `P3-low`
3. Start with Issue #1 (Test Walk Phase)
4. Complete P0 and P1 issues before marketing
5. Tackle P2 and P3 based on user feedback

---

**Status:** 📋 Ready to create in GitHub
**Owner:** Karl Waldman
**Project:** Excel Energy Comparison Add-in
