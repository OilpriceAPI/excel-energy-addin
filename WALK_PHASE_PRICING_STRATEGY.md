# Walk Phase: Pricing Protection Strategy

**Goal:** Implement historical data and premium features WITHOUT creating pricing loopholes

**Critical Rule:** Free users MUST NOT be able to bypass paid tier restrictions through clever Excel usage

---

## 🚨 Pricing Tiers (Current State)

### Free Tier ($0/month)
- **Limit:** 1,000 API requests/month
- **Features:** Latest prices only
- **RESTRICTION:** No historical data access

### Exploration Tier ($15/month)
- **Limit:** 10,000 API requests/month
- **Features:** Latest prices + **Historical data (unlimited)**
- **Unlocks:** Past year, past month, custom date ranges

### Production Tier ($45/month)
- **Limit:** 50,000 API requests/month
- **Features:** Everything in Exploration + Price alerts + Priority support

### Reservoir Mastery Tier ($129/month)
- **Limit:** 250,000 API requests/month
- **Features:** Everything in Production + Drilling intelligence + Futures data

---

## ⚠️ Potential Bypass Vectors (What Clever Users Might Try)

### 🔴 ATTACK VECTOR #1: Caching Historical Data Locally
**What they might do:**
- Fetch historical data once on paid trial
- Save all data to Excel sheet
- Cancel subscription
- Continue using cached data indefinitely

**Prevention:**
```typescript
// Excel add-in: Mark historical data with expiration
interface HistoricalDataCache {
  data: PriceData[];
  fetchedAt: string;
  expiresAt: string; // 7 days from fetch
  tier: 'exploration' | 'production' | 'reservoir_mastery';
}

// On every Excel file open, check cache expiration
function validateCachedData(): void {
  const cache = getCachedHistoricalData();

  if (cache && new Date(cache.expiresAt) < new Date()) {
    // Expired - clear historical sheets
    clearHistoricalSheets();
    showUpgradePrompt('Historical data expired. Upgrade to refresh.');
  }
}
```

**Backend Protection:**
- Track which users downloaded historical data
- If user downgrades from paid → free, flag their cached data as expired
- API returns `expired: true` flag for free users requesting historical endpoints

---

### 🔴 ATTACK VECTOR #2: Incremental "Latest" Fetching
**What they might do:**
- Stay on free tier
- Fetch "latest" price every hour manually
- Build own historical dataset over time

**Why this is acceptable:**
- They're using their 1,000 free requests legitimately
- Building data manually (1 fetch/hour = 720 fetches/month) is fair use
- Takes 365 days to build 1 year of history

**No prevention needed** - This is actually good behavior (engaged user)

---

### 🔴 ATTACK VECTOR #3: Multiple Free Accounts
**What they might do:**
- Create 10 free accounts
- Get 10,000 free requests/month total
- Rotate API keys in Excel

**Prevention (Backend):**
```ruby
# Already implemented in User model
validates :email, uniqueness: true

# Add to API authentication middleware:
def check_for_account_abuse
  ip_address = request.remote_ip

  # Count API keys used from this IP in last 24 hours
  keys_used = ApiRequest.where(ip_address: ip_address)
                        .where('created_at > ?', 24.hours.ago)
                        .select(:api_key_id).distinct.count

  if keys_used > 3
    # Flag for manual review
    SecurityAlert.create!(
      alert_type: 'multiple_api_keys_same_ip',
      ip_address: ip_address,
      severity: 'medium'
    )

    # Rate limit this IP more aggressively
    Rack::Attack.blocklist_ip(ip_address, duration: 1.hour)
  end
end
```

**Additional Prevention (Excel Add-in):**
```typescript
// Detect API key switching
let previousApiKey: string | null = null;

function onApiKeySave(newKey: string): void {
  if (previousApiKey && previousApiKey !== newKey) {
    // Log API key switch event
    trackEvent('API Key Switched', {
      previousKey: previousApiKey.substring(0, 8), // First 8 chars only
      timestamp: new Date().toISOString()
    });

    // Backend: If same user switches keys >3 times/week, flag for review
  }
  previousApiKey = newKey;
}
```

---

### 🔴 ATTACK VECTOR #4: Shared API Keys (Team Abuse)
**What they might do:**
- One person buys Exploration tier ($15/month)
- Shares API key with 10 colleagues
- All use Excel add-in with same key

**Detection (Backend):**
```ruby
# Already tracked: api_requests table has ip_address, user_agent

class ApiKeyAbuseDetector
  def check_for_sharing(api_key)
    requests = ApiRequest.where(api_key: api_key)
                         .where('created_at > ?', 7.days.ago)

    unique_ips = requests.select(:ip_address).distinct.count
    unique_user_agents = requests.select(:user_agent).distinct.count

    # Red flags:
    # - More than 5 unique IPs in 7 days
    # - IPs from different geographic regions (use MaxMind GeoIP)
    # - Different user agents (Windows + Mac + Linux simultaneously)

    if unique_ips > 5
      user = api_key.user
      user.flag_for_abuse_review!(reason: 'api_key_sharing_suspected')

      # Send warning email
      UserMailer.api_key_sharing_warning(user).deliver_later
    end
  end
end
```

**Prevention in Excel Add-in:**
```typescript
// Add device fingerprinting
function getDeviceFingerprint(): string {
  return {
    platform: Office.context.platform, // Windows, Mac, Online
    hostVersion: Office.context.host.version,
    language: Office.context.displayLanguage,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// Send with every API request
headers: {
  'Authorization': `Token ${apiKey}`,
  'X-Device-Fingerprint': btoa(JSON.stringify(getDeviceFingerprint())),
  'X-Excel-Session-Id': getSessionId() // Unique per Excel session
}
```

---

### 🔴 ATTACK VECTOR #5: Batch Downloading Historical Data
**What they might do:**
- Sign up for $15 Exploration tier
- Immediately download 20 years of historical data for all commodities
- Cancel subscription after 1 month
- Have lifetime historical data for $15

**Prevention (Rate Limiting):**
```ruby
# In app/controllers/api/v1/prices_controller.rb

def past_year
  # Check tier
  unless user.can_access_historical?
    return render_upgrade_required('historical_data')
  end

  # Rate limit historical downloads
  cache_key = "historical_download:#{user.id}:#{params[:by_code]}"

  if Rails.cache.read(cache_key)
    return render json: {
      error: 'Rate limit exceeded for historical data',
      message: 'You can fetch historical data for each commodity once per hour',
      retry_after: 3600
    }, status: 429
  end

  # Allow download
  data = fetch_past_year_data(params[:by_code])

  # Cache for 1 hour (prevents re-downloading same commodity)
  Rails.cache.write(cache_key, true, expires_in: 1.hour)

  render json: data
end
```

**Excel Add-in Protection:**
```typescript
// Warn user about rate limits BEFORE fetching
async function fetchHistoricalData(code: string): Promise<void> {
  const lastFetch = localStorage.getItem(`historical_${code}_lastFetch`);

  if (lastFetch) {
    const hoursSince = (Date.now() - parseInt(lastFetch)) / (1000 * 60 * 60);

    if (hoursSince < 1) {
      const minutesRemaining = Math.ceil((1 - hoursSince) * 60);
      showError(`Historical data for ${code} can be fetched once per hour. Try again in ${minutesRemaining} minutes.`);
      return;
    }
  }

  // Proceed with fetch
  const data = await api.getPastYear(code);
  localStorage.setItem(`historical_${code}_lastFetch`, Date.now().toString());
}
```

---

### 🟢 ACCEPTABLE USE: Legitimate Power Users
**What they do:**
- Pay for Exploration tier
- Use Excel daily for analysis
- Fetch historical data when needed
- Share workbooks with colleagues (with cached data)

**This is fine because:**
- They're paying customers
- Sharing Excel files (not API keys) is expected
- Recipients see static data (not live API access)
- Encourages viral growth (colleagues see value → sign up)

---

## ✅ Walk Phase Feature Implementation with Pricing Protection

### Feature #1: Historical Data Access

**UI Changes (taskpane.html):**
```html
<!-- New "Historical" section -->
<section class="actions-section">
  <h2>Historical Data</h2>

  <div class="action-card">
    <h3>Fetch Past Year</h3>
    <p>Get 365 days of historical prices for trend analysis</p>

    <!-- Tier gate -->
    <div id="historical-tier-gate" class="tier-gate" style="display: none;">
      <div class="tier-gate-content">
        <p class="tier-gate-message">
          📊 Historical data is available on paid plans
        </p>
        <ul class="tier-benefits">
          <li>✓ 20+ years of price history</li>
          <li>✓ Daily, weekly, monthly data</li>
          <li>✓ Excel charts & pivot tables</li>
        </ul>
        <button class="btn-upgrade" onclick="openUpgradePage()">
          Upgrade to Exploration ($15/mo)
        </button>
        <a href="/pricing" target="_blank" class="link-subtle">Compare plans</a>
      </div>
    </div>

    <!-- Feature UI (hidden for free users) -->
    <div id="historical-feature-ui">
      <select id="historical-commodity">
        <option value="BRENT_CRUDE_USD">Brent Crude</option>
        <option value="WTI_USD">WTI</option>
        <!-- ... -->
      </select>

      <button id="fetch-historical-btn" class="btn-primary">
        Fetch Past Year
      </button>

      <div class="rate-limit-warning">
        <small>Rate limit: 1 fetch per commodity per hour</small>
      </div>
    </div>
  </div>
</section>
```

**API Client Changes (api-client.ts):**
```typescript
export class OilPriceAPIClient {

  async checkUserTier(): Promise<UserTier> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { 'Authorization': `Token ${this.apiKey}` }
    });

    const user = await response.json();

    return {
      plan: user.plan, // 'free', 'exploration', 'production', 'reservoir_mastery'
      canAccessHistorical: ['exploration', 'production', 'reservoir_mastery'].includes(user.plan),
      canAccessFutures: user.plan === 'reservoir_mastery',
      requestsUsed: user.requests_this_month,
      requestsLimit: user.request_limit
    };
  }

  async getPastYear(code: string): Promise<HistoricalDataResponse> {
    // Check tier BEFORE making request
    const tier = await this.checkUserTier();

    if (!tier.canAccessHistorical) {
      throw new Error('UPGRADE_REQUIRED:historical_data');
    }

    const url = `${API_BASE_URL}/prices/past_year?by_code=${code}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'X-Excel-Addin-Version': '1.0.0'
      }
    });

    if (response.status === 403) {
      const error = await response.json();
      if (error.upgrade_required) {
        throw new Error('UPGRADE_REQUIRED:' + error.feature);
      }
    }

    if (response.status === 429) {
      throw new Error('RATE_LIMIT:Please wait 1 hour before fetching this commodity again');
    }

    return await response.json();
  }
}
```

**Error Handling (taskpane.js):**
```typescript
async function fetchHistoricalData(): void {
  try {
    const code = document.getElementById('historical-commodity').value;
    showStatus('Fetching historical data...');

    const data = await apiClient.getPastYear(code);

    // Create historical sheet
    await createHistoricalSheet(data);

    showStatus(`✓ Fetched ${data.data.length} days of historical data`);
    trackEvent('Historical Data Fetched', { commodity: code, days: data.data.length });

  } catch (error) {
    if (error.message.startsWith('UPGRADE_REQUIRED')) {
      const feature = error.message.split(':')[1];
      showUpgradePrompt(feature);
      trackEvent('Upgrade Prompt Shown', { feature, source: 'historical_data' });

    } else if (error.message.startsWith('RATE_LIMIT')) {
      showError(error.message.split(':')[1]);
      trackEvent('Rate Limit Hit', { feature: 'historical_data' });

    } else {
      showError('Failed to fetch historical data: ' + error.message);
    }
  }
}

function showUpgradePrompt(feature: string): void {
  // Hide feature UI
  document.getElementById('historical-feature-ui').style.display = 'none';

  // Show tier gate
  document.getElementById('historical-tier-gate').style.display = 'block';

  // Track for conversion optimization
  trackEvent('Paywall Encountered', { feature });
}

function openUpgradePage(): void {
  window.open('https://www.oilpriceapi.com/pricing?source=excel_historical', '_blank');
  trackEvent('Upgrade Clicked', { feature: 'historical_data', source: 'excel_addin' });
}
```

---

### Feature #2: Bulk Data Endpoint (Optimization)

**Current Problem:**
- Fetching 6 commodities = 6 API calls
- User hits 1,000 request limit in 166 refreshes
- Inefficient for dashboard use case

**Solution: `/v1/prices/all` Endpoint**

**Backend Implementation:**
```ruby
# app/controllers/api/v1/prices_controller.rb

def all
  # This endpoint counts as 1 API request (not 78 requests)
  ApiRequest.create!(
    user: current_user,
    api_key: current_api_key,
    endpoint: '/v1/prices/all',
    request_count: 1, # IMPORTANT: Only 1 request
    ip_address: request.remote_ip,
    user_agent: request.user_agent
  )

  # Fetch all latest prices (cached for 5 minutes)
  all_prices = Rails.cache.fetch('prices:all:latest', expires_in: 5.minutes) do
    Commodity.all.map do |commodity|
      {
        code: commodity.code,
        name: commodity.name,
        price: commodity.latest_price,
        unit: commodity.unit,
        currency: 'USD',
        timestamp: commodity.price_updated_at
      }
    end
  end

  render json: {
    data: all_prices,
    count: all_prices.length,
    timestamp: Time.current,
    cache_duration: 300 # seconds
  }
end
```

**Excel Add-in Usage:**
```typescript
async function fetchAllPrices(): Promise<void> {
  // ONE API call for ALL commodities
  const response = await apiClient.getAllPrices();

  // Filter to user's selected commodities
  const selectedCodes = getSelectedCommodityCodes();
  const filteredPrices = response.data.filter(p => selectedCodes.includes(p.code));

  // Create sheets
  await createDataSheet(filteredPrices);

  showStatus(`✓ Fetched ${filteredPrices.length} prices (1 API call)`);
}
```

**Rate Limit Impact:**
- Before: 6 calls per refresh × 166 refreshes = 996 requests (limit reached)
- After: 1 call per refresh × 1000 refreshes = 1000 requests
- **Result: 6x more efficient** ✅

---

### Feature #3: Commodity Discovery (Dynamic List)

**Current Problem:**
- Hardcoded to 6 commodities
- API has 78 commodities available
- Users can't access LNG, Propane, Ethanol, etc.

**Solution: Dynamic Commodity Selector**

**Backend (No changes needed - endpoint exists):**
```bash
GET /v1/commodities
# Returns all 78 commodities with metadata
```

**Excel Implementation:**
```typescript
interface Commodity {
  code: string;
  name: string;
  category: string; // 'crude_oil', 'natural_gas', 'refined_products', etc.
  unit: string;
  heat_content_mmbtu?: number;
}

async function loadCommodities(): Promise<void> {
  // Cache for 24 hours (commodities don't change often)
  let commodities = JSON.parse(localStorage.getItem('commodities_cache') || 'null');

  if (!commodities || isCacheExpired('commodities_cache_time', 24 * 60 * 60 * 1000)) {
    // Fetch from API (counts as 1 API request)
    commodities = await apiClient.getCommodities();
    localStorage.setItem('commodities_cache', JSON.stringify(commodities));
    localStorage.setItem('commodities_cache_time', Date.now().toString());
  }

  // Render dynamic commodity list
  renderCommoditySelector(commodities);
}

function renderCommoditySelector(commodities: Commodity[]): void {
  const container = document.getElementById('commodity-list');

  // Group by category
  const categories = groupBy(commodities, 'category');

  container.innerHTML = '';

  for (const [category, items] of Object.entries(categories)) {
    const section = document.createElement('div');
    section.className = 'commodity-category';

    const header = document.createElement('h4');
    header.textContent = formatCategoryName(category);
    section.appendChild(header);

    items.forEach(commodity => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" value="${commodity.code}">
        ${commodity.name}
        <span class="commodity-unit">(${commodity.unit})</span>
      `;
      section.appendChild(label);
    });

    container.appendChild(section);
  }
}
```

**Pricing Protection:**
- `/v1/commodities` is FREE (metadata only, no price data)
- Counts as 1 API request
- Cached for 24 hours (negligible usage)

---

## 🎯 Walk Phase Pricing Protection Summary

### Free Tier Restrictions Enforced

**What Free Users CAN'T Do:**
1. ❌ Access historical data (past_year, past_month)
2. ❌ Download futures curves
3. ❌ Access drilling intelligence
4. ❌ Set up price alerts
5. ❌ Use custom functions for historical lookup

**What Free Users CAN Do:**
1. ✅ Fetch latest prices (up to 1,000 requests/month)
2. ✅ Use `/v1/prices/all` for efficient bulk fetching (1 call = 1 request)
3. ✅ See full commodity list (78 commodities)
4. ✅ Convert to MBtu
5. ✅ Share Excel files with cached data

### Upgrade Conversion Strategy

**Soft Paywalls (Encourage Upgrade, Don't Block):**
- Show upgrade CTA when free user clicks "Historical Data"
- Display "Unlock Historical Analysis" banner after 50 API calls
- Show success stories from paid users
- Offer 7-day free trial of Exploration tier

**Track Paywall Engagement:**
```typescript
// When user encounters paywall
trackEvent('Paywall Shown', {
  feature: 'historical_data',
  userTier: 'free',
  requestsUsed: usageCounter.used,
  daysActive: daysSinceFirstUse
});

// When user clicks "Upgrade"
trackEvent('Upgrade Intent', {
  feature: 'historical_data',
  source: 'excel_addin',
  targetTier: 'exploration'
});

// Track conversion in backend when upgrade completes
```

### Backend Enforcement (Defense in Depth)

**Layer 1: API Authentication**
```ruby
# app/controllers/api/v1/base_controller.rb

def require_historical_access!
  unless current_user.can_access_historical?
    render json: {
      error: 'Upgrade required',
      message: 'Historical data access requires Exploration tier or higher',
      upgrade_required: true,
      feature: 'historical_data',
      current_plan: current_user.plan,
      upgrade_url: 'https://www.oilpriceapi.com/pricing'
    }, status: 403

    false
  end
end
```

**Layer 2: Feature Flags**
```ruby
# app/models/user.rb

def can_access_historical?
  ['exploration', 'production', 'reservoir_mastery'].include?(plan)
end

def can_access_futures?
  reservoir_mastery? || admin?
end

def can_use_webhooks?
  ['production', 'reservoir_mastery'].include?(plan)
end
```

**Layer 3: Request Counting**
```ruby
# Historical endpoints still count toward request limit

def past_year
  require_historical_access!

  # Count as 1 request (not free)
  ApiRequest.create!(
    user: current_user,
    endpoint: '/v1/prices/past_year',
    request_count: 1
  )

  # Check if over limit
  if current_user.api_requests_this_month >= current_user.request_limit
    return render_rate_limit_exceeded
  end

  # Proceed...
end
```

---

## 📊 Expected Conversion Rates

### Crawl Phase (Current - Latest Prices Only)
- 100+ installs
- 50+ active API keys
- **5%** free → paid conversion (5 users × $15 = $75/mo)

### Walk Phase (With Historical Data Paywall)
- 500+ installs
- 200+ active users
- **15%** free → paid conversion (30 users × $15 = $450/mo)
- **Why higher?** Historical data is Excel's core strength

### Conversion Math
**Hypothesis:** Users who click "Fetch Historical" are 10x more likely to convert

**Tracking:**
```typescript
// Funnel metrics to track
1. Users who open Historical tab: 60% of active users
2. Users who click "Fetch Historical": 40% of Historical tab viewers
3. Users who see upgrade prompt: 100% of Historical fetchers (free tier)
4. Users who click "Upgrade": 30% of prompt viewers
5. Users who complete purchase: 50% of upgrade clickers

Conversion rate = 0.60 × 0.40 × 1.00 × 0.30 × 0.50 = 3.6%

If 200 active users → 7 conversions/month × $15 = $105 MRR from this feature alone
```

---

## 🚀 Walk Phase Implementation Plan

### Week 1: Historical Data Foundation
- [x] Analyze API tier restrictions
- [ ] Design tier gate UI components
- [ ] Implement `checkUserTier()` method
- [ ] Add `/v1/prices/past_year` endpoint protection
- [ ] Test upgrade prompt flow

### Week 2: Bulk Data Optimization
- [ ] Implement `/v1/prices/all` usage in Excel
- [ ] Update UI to show "1 API call" efficiency message
- [ ] Test with free tier rate limits
- [ ] Measure API call reduction

### Week 3: Commodity Discovery
- [ ] Implement dynamic commodity loading
- [ ] Cache commodity metadata
- [ ] Update UI with category grouping
- [ ] Test with all 78 commodities

### Week 4: Analytics & Optimization
- [ ] Set up paywall engagement tracking
- [ ] A/B test upgrade CTA copy
- [ ] Monitor conversion rates
- [ ] Iterate on upgrade messaging

---

## ✅ Pricing Protection Checklist

**Before shipping Walk phase:**

- [ ] Historical endpoints return 403 for free users
- [ ] Upgrade prompts tracked in analytics
- [ ] Rate limiting prevents bulk downloads
- [ ] Device fingerprinting detects key sharing
- [ ] Cache expiration enforced in Excel
- [ ] `/v1/prices/all` counts as 1 request (not 78)
- [ ] Commodity metadata cached (not fetched repeatedly)
- [ ] User tier checked BEFORE API calls
- [ ] Error messages include upgrade CTAs
- [ ] Conversion funnel tracked end-to-end

---

**Created:** 2025-01-24
**Status:** Ready for Implementation
**Risk Level:** LOW (Multiple layers of protection)
**Expected MRR Impact:** +$450/mo from historical data conversions
