# Excel Energy Add-in PRD: Crawl, Walk, Run Strategy

**Goal:** Transform Excel add-in into primary revenue driver by reaching non-technical energy analysts at BHP, Nord Oil, EMX Energy, and similar corporations.

**Target User:** Energy analysts, traders, procurement managers who live in Excel but don't code.

**ARR Impact:** 🔥🔥🔥🔥🔥 (Direct path to corporate $ purchases)

---

## Current State Analysis

### ✅ What We Have (Phase 1 Complete - 98% test coverage)
- Energy unit conversions ($/MBtu standardization)
- API client with error handling
- Data and Process sheets generation
- Basic taskpane UI
- TypeScript codebase with Jest tests
- Deployed to Azure Static Web Apps
- Webpack build pipeline

### ❌ What's Missing for Launch
- AppSource submission requirements
- Polished UI/UX
- Onboarding flow
- Upgrade prompts to paid API tiers
- Analytics/telemetry
- Documentation
- Marketing materials

---

## 🐛 CRAWL: Polish & Launch (Week 1-2)
**Goal:** Get to AppSource and first 100 corporate installs

### Issue #505: AppSource Submission Requirements
**Priority:** P0
**Effort:** 3 days
**Impact:** Required for distribution

- [ ] Update manifest.xml with production URLs
- [ ] Create high-res screenshots (1366x768, 5 images min)
- [ ] Write AppSource description (300 char summary + detailed)
- [ ] Record demo video (60-90 seconds)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Support documentation
- [ ] Test on Excel Online, Desktop (Windows + Mac)

**Acceptance Criteria:**
- Passes AppSource validation
- Listed in Office Add-ins store
- Searchable by "oil prices", "energy", "commodity"

---

### Issue #506: UI/UX Polish
**Priority:** P0
**Effort:** 2 days
**Impact:** First impressions matter

**Before (Current):**
- Basic form inputs
- No loading states
- No error messages
- No success confirmations

**After (Polished):**
- [ ] Loading spinners during API calls
- [ ] Success/error toast notifications
- [ ] Empty state illustrations
- [ ] Tooltips for all buttons
- [ ] Professional color scheme (match oilpriceapi.com)
- [ ] Keyboard shortcuts (Ctrl+P for fetch prices)
- [ ] Responsive layout for different Excel panel widths

**Design System:**
- Primary color: #0066CC (Excel blue)
- Success: #28A745
- Error: #DC3545
- Font: Segoe UI (Office standard)

---

### Issue #507: Onboarding & API Key Flow
**Priority:** P0
**Effort:** 2 days
**Impact:** Reduce friction, increase conversions

**User Flow:**
1. Install add-in from AppSource
2. Open taskpane → "Welcome" screen
3. "Get Free API Key" button → Opens https://www.oilpriceapi.com/signup
4. Copy API key from dashboard
5. Paste into add-in settings
6. "Test Connection" → Success ✓
7. "Fetch Prices" → Data populated

**Features:**
- [ ] Welcome screen with quick start guide
- [ ] "Get API Key" button (opens signup page)
- [ ] API key validation (test before saving)
- [ ] Remember API key (localStorage)
- [ ] "Need help?" link to docs
- [ ] Free tier usage counter (X/1000 requests used)

---

### Issue #508: Analytics & Telemetry
**Priority:** P0
**Effort:** 1 day
**Impact:** Understand usage, optimize conversion

**Track Events:**
- [ ] Add-in installed
- [ ] Taskpane opened
- [ ] API key saved
- [ ] Prices fetched (which commodities)
- [ ] Conversion to MBtu
- [ ] Error events (API failures, invalid keys)
- [ ] Upgrade button clicked

**Implementation:**
- Use Plausible Analytics (privacy-friendly)
- No PII collection
- Aggregate metrics only

**Key Metrics:**
- DAU (Daily Active Users)
- Retention rate (D1, D7, D30)
- Conversion rate (install → API key → fetch prices)
- Upgrade rate (free → paid tier)

---

### Issue #509: Landing Page & Marketing
**Priority:** P0
**Effort:** 1 day
**Impact:** Drive installs

**Create:** `/tools/excel-energy-comparison` landing page

**Content:**
- Hero: "Compare Energy Prices in Excel - No Coding Required"
- Video demo (60 seconds)
- Feature list with screenshots
- Testimonials (once we have users)
- "Install Now" CTA → AppSource link
- FAQ section

**SEO Keywords:**
- "excel energy prices add-in"
- "commodity prices excel"
- "oil price excel plugin"
- "energy unit conversion excel"

**Distribution:**
1. LinkedIn post with demo video
2. Blog post: "Introducing: Energy Price Comparison for Excel"
3. Email existing users: "New: Excel add-in available"
4. Reddit: r/excel, r/finance, r/energy

---

## 🚶 WALK: Premium Features (Week 3-6)
**Goal:** Convert free users to paid API tiers

### Issue #510: Historical Data Analysis
**Priority:** P1
**Effort:** 5 days
**Impact:** High-value feature for analysts

**Features:**
- [ ] Date range picker (start/end dates)
- [ ] "Fetch Historical" button
- [ ] Time series chart generation
- [ ] Daily/weekly/monthly aggregation options
- [ ] Export to CSV
- [ ] Trend analysis (moving averages, volatility)

**UI:**
- New "Historical" tab in taskpane
- Calendar widget for date selection
- Progress bar for large date ranges
- Auto-generate line chart in new sheet

**Upgrade Prompt:**
- Free tier: Last 30 days only
- Paid tiers: Unlimited history (20+ years)
- "Upgrade for full historical access" CTA

---

### Issue #511: Multi-Currency Support
**Priority:** P1
**Effort:** 3 days
**Impact:** International users

**Currencies:**
- [ ] USD (default)
- [ ] EUR
- [ ] GBP
- [ ] JPY
- [ ] CNY

**Features:**
- Currency selector dropdown
- Real-time FX rates from OilPriceAPI
- Automatic conversion in Process sheet
- FX rate timestamp displayed

**Process Sheet Columns:**
| Commodity | USD/MBtu | EUR/MBtu | GBP/MBtu |
|-----------|----------|----------|----------|
| Brent     | $14.74   | €13.45   | £11.82   |

---

### Issue #512: Price Alerts
**Priority:** P1
**Effort:** 4 days
**Impact:** Engagement & retention

**Features:**
- [ ] Set price thresholds (Brent > $85, WTI < $75)
- [ ] Alert conditions (above/below/crosses)
- [ ] Notification method (Excel notification, email)
- [ ] Alert history log
- [ ] Snooze/disable alerts

**UI:**
- "Alerts" tab in taskpane
- Add/edit/delete alert rules
- Visual indicator when alert triggers
- Alert log table in Excel

**Backend:**
- Requires webhook support (already exists!)
- Webhook → Excel notification via Office.js

---

### Issue #513: Custom Functions (UDFs)
**Priority:** P1
**Effort:** 5 days
**Impact:** Power users, spreadsheet formulas

**Excel Functions:**
```excel
=OILPRICE("BRENT")              → 82.30
=OILPRICE.HISTORICAL("WTI", "2024-01-01")  → 75.45
=OILPRICE.CONVERT(82.30, "barrel", "MBtu") → 14.19
=OILPRICE.SPREAD("BRENT", "WTI")           → 3.85
```

**Features:**
- [ ] Real-time price functions
- [ ] Historical price lookup
- [ ] Unit conversion functions
- [ ] Spread calculations
- [ ] Auto-refresh (configurable interval)

**Benefits:**
- No taskpane needed
- Use in any formula
- Native Excel experience
- Update entire workbook at once

---

## 🏃 RUN: Enterprise Features (Month 2-3)
**Goal:** $50k+ MRR from Excel users alone

### Issue #514: Scenario Modeling Tool
**Priority:** P2
**Effort:** 1 week
**Impact:** High-value for corporate planning

**Features:**
- [ ] What-if analysis (Brent +10%, Natural Gas -5%)
- [ ] Multiple scenario comparison
- [ ] Sensitivity table generation
- [ ] Monte Carlo simulation (optional)
- [ ] Scenario saving/loading

**UI:**
- "Scenarios" tab in taskpane
- Slider controls for price adjustments
- Side-by-side scenario comparison table
- Export scenarios as named sheets

**Use Cases:**
- Budget planning under different price assumptions
- Hedging strategy evaluation
- Risk assessment

---

### Issue #515: Forward Curves & Futures
**Priority:** P2
**Effort:** 1 week
**Impact:** Trading/procurement use case

**Features:**
- [ ] Fetch NYMEX/ICE forward curves
- [ ] Backwardation/contango visualization
- [ ] Spread analysis (calendar spreads)
- [ ] Forward curve charting
- [ ] Curve comparison (current vs historical)

**Data Sources:**
- OilPriceAPI futures endpoints
- Up to 24 months forward

**Charts:**
- Forward curve line chart
- Term structure comparison
- Spread heatmap

---

### Issue #516: Team Collaboration
**Priority:** P2
**Effort:** 1 week
**Impact:** Enterprise sales

**Features:**
- [ ] Shared API key pools (team accounts)
- [ ] Usage analytics by team member
- [ ] Shared alert templates
- [ ] Workbook templates library
- [ ] Admin dashboard for team managers

**Enterprise Plan:**
- $499/month for 10 seats
- Centralized billing
- Usage reporting
- SSO integration (optional)

---

### Issue #517: White-Label / Custom Branding
**Priority:** P3
**Effort:** 3 days
**Impact:** Enterprise upsell

**Features:**
- [ ] Custom logo in taskpane
- [ ] Custom color scheme
- [ ] "Powered by [Company]" footer
- [ ] Custom support URL
- [ ] Custom welcome screen

**Pricing:**
- $1,000 one-time setup fee
- $99/month per branded instance
- Minimum: Enterprise plan required

---

## Widgets Integration (Already Exists!)

### Current State
We already have `/widgets` pages in website:
- `/widgets/oil-price-ticker`
- `/widgets/fuel-surcharge-calculator`
- `/widgets/carbon-calculator`

### Issue #518: Excel ↔ Widgets Bridge
**Priority:** P1
**Effort:** 2 days
**Impact:** Cross-selling opportunity

**Features:**
- [ ] "Export to Widget" button in Excel add-in
- [ ] Generate embeddable widget code from Excel data
- [ ] Customize widget settings (theme, refresh rate)
- [ ] Copy widget code to clipboard
- [ ] "Add to Website" wizard

**User Flow:**
1. User fetches prices in Excel
2. Clicks "Share as Widget"
3. Selects widget type (ticker, chart, table)
4. Customizes appearance
5. Gets embed code
6. Pastes on corporate intranet/website

**Upsell:**
- Free widgets have "Powered by OilPriceAPI" link
- Paid users can white-label widgets
- Widget Pro: $29/month (remove branding, custom refresh)

---

## Monetization Strategy

### Free Tier
- 1,000 API requests/month (shared with web API)
- Basic price fetching
- Energy unit conversions
- Data and Process sheets
- "Powered by OilPriceAPI" in generated sheets

### Paid Tiers (Existing API plans)
**Exploration ($15/mo):**
- 10,000 requests/month
- Historical data (full archive)
- Multi-currency support
- No branding

**Production Boost ($45/mo):**
- 50,000 requests/month
- Price alerts
- Custom functions (UDFs)
- Priority support

**Reservoir Mastery ($129/mo):**
- 250,000 requests/month
- Forward curves & futures
- Scenario modeling
- Team collaboration (3 seats)

**Enterprise (Custom pricing):**
- Unlimited requests
- White-label branding
- Dedicated support
- Custom integrations
- SSO

---

## Success Metrics

### Crawl Phase (Week 1-2)
- ✅ AppSource approved
- 100+ installs
- 50+ active API keys connected
- 20+ daily active users
- 5%+ conversion (install → API key)

### Walk Phase (Week 3-6)
- 500+ installs
- 200+ active users
- 10+ paid conversions ($15-45/mo tier)
- $500+ MRR from Excel users
- 10%+ D30 retention

### Run Phase (Month 2-3)
- 2,000+ installs
- 800+ active users
- 50+ paid customers
- $5,000+ MRR from Excel
- 2-3 enterprise deals ($499+/mo)
- 20%+ D30 retention

---

## Technical Architecture

### Current Stack
- **Frontend:** Office.js (TaskPane API)
- **Build:** Webpack 5, TypeScript
- **Testing:** Jest (98% coverage)
- **Hosting:** Azure Static Web Apps
- **API:** OilPriceAPI REST endpoints

### Future Additions
- **Custom Functions:** Office.js Custom Functions API
- **Analytics:** Plausible Analytics
- **Webhooks:** Office.js Dialog API for alerts
- **Storage:** localStorage for API keys, settings

### Performance Targets
- Add-in load time: <2 seconds
- Price fetch: <1 second
- Sheet generation: <500ms
- Custom function update: <100ms per cell

---

## Go-To-Market Timeline

### Week 1: Polish & Submit
- Day 1-2: UI/UX polish (#506)
- Day 3: Onboarding flow (#507)
- Day 4: AppSource requirements (#505)
- Day 5: Submit to AppSource

### Week 2: Launch & Promote
- Day 1-2: Create landing page (#509)
- Day 3: Set up analytics (#508)
- Day 4-5: Marketing push (LinkedIn, email, blog)

### Week 3-4: Historical Data
- Implement historical data feature (#510)
- Test with 5-10 beta users
- Launch as premium feature

### Week 5-6: Currency & Alerts
- Multi-currency support (#511)
- Price alerts system (#512)
- Custom functions prototype (#513)

### Month 2: Enterprise Features
- Scenario modeling (#514)
- Forward curves (#515)
- Team collaboration (#516)

### Month 3: Scale & Optimize
- White-label option (#517)
- Widget integration (#518)
- Conversion optimization
- Sales team hiring (if needed)

---

## Risk Mitigation

### Risk 1: AppSource Rejection
**Mitigation:**
- Follow validation guidelines strictly
- Test on all Excel platforms
- Get pre-submission review
- Have fallback: Direct download from website

### Risk 2: Low Adoption
**Mitigation:**
- Strong landing page with demo video
- LinkedIn ads targeting energy analysts
- Email campaign to existing API users
- Partnership with energy industry groups

### Risk 3: Free Tier Abuse
**Mitigation:**
- 1,000 request limit (same as web)
- Rate limiting (10 requests per minute)
- Require email for API key
- Monitor usage patterns

### Risk 4: Technical Issues
**Mitigation:**
- 98% test coverage maintained
- Gradual rollout (beta → general availability)
- Error tracking with Sentry
- Hotfix process documented

---

## Open Questions

1. **Branding:** Should add-in be "OilPriceAPI" or "Energy Price Comparison"?
   - **Recommendation:** "Energy Price Comparison by OilPriceAPI"

2. **Pricing:** Should Excel users pay separately or use same API plans?
   - **Recommendation:** Same API plans (simpler, more conversions)

3. **Support:** Who handles Excel-specific support questions?
   - **Recommendation:** Same support team, document Excel issues separately

4. **Offline Mode:** Should add-in cache prices for offline use?
   - **Recommendation:** Yes, last 24 hours cached (future enhancement)

---

## Next Steps (Immediate)

1. **Review this PRD** - Get feedback from Karl
2. **Create GH Issues** - Break down into actionable issues (#505-518)
3. **Prioritize Crawl Phase** - Focus on AppSource launch first
4. **Start UI Polish** - Biggest visual impact, quickest win
5. **Set Up Analytics** - Can't improve what we don't measure

---

**Document Version:** 1.0
**Last Updated:** 2025-11-24
**Owner:** Karl / OilPriceAPI Team
**Status:** Draft → Awaiting Approval
