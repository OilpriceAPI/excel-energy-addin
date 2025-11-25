# Walk Phase Testing Guide

**Purpose:** Validate pricing protection and Walk phase features before marketing launch
**Testing Environment:** Production (https://calm-bush-0e3aadf10.2.azurestaticapps.net)
**Estimated Time:** 45 minutes

---

## 🎯 Testing Objectives

1. **Pricing Protection:** Verify free users cannot bypass tier restrictions
2. **Feature Functionality:** Confirm historical data and bulk operations work correctly
3. **User Experience:** Ensure upgrade prompts are clear and compelling
4. **Analytics:** Validate all tracking events fire correctly
5. **Error Handling:** Test edge cases and failure scenarios

---

## 🧪 Test Scenarios

### Scenario 1: Free Tier User (Paywall Testing)

**Setup:**
- API Key: Use a free tier account (1,000 requests/month)
- Expected Behavior: Historical data section shows tier gate, not feature UI

**Test Steps:**

1. **Load Add-in with Free API Key**
   ```
   ✓ Open Excel
   ✓ Insert → My Add-ins → Energy Price Comparison
   ✓ Settings → Enter free tier API key
   ✓ Click "Save"
   ✓ Wait for validation success
   ```

2. **Verify Tier Gate Displayed**
   ```
   ✓ Scroll to "Historical Data" section
   ✓ Confirm purple gradient paywall is visible
   ✓ Confirm message: "📊 Historical data is available on paid plans"
   ✓ Confirm benefits list shows:
     - ✓ 20+ years of price history
     - ✓ Daily, weekly, monthly data
     - ✓ Excel charts & pivot tables
   ✓ Confirm "Upgrade to Exploration ($15/mo)" button is visible
   ✓ Confirm commodity dropdown is HIDDEN
   ✓ Confirm "Fetch Past Year" and "Fetch Past Month" buttons are HIDDEN
   ```

3. **Test Upgrade Button**
   ```
   ✓ Click "Upgrade to Exploration ($15/mo)" button
   ✓ Confirm new tab opens: https://www.oilpriceapi.com/pricing
   ✓ Check browser console for analytics event:
     - Event: "Paywall Shown"
     - Props: { feature: 'historical_data' }
   ```

4. **Verify Latest Prices Still Work**
   ```
   ✓ Scroll to "Actions" section
   ✓ Select commodities: Brent, WTI, Natural Gas
   ✓ Click "Fetch Prices"
   ✓ Confirm Data sheet created with prices
   ✓ Verify usage counter increments (e.g., 1 / 1,000 → 4 / 1,000)
   ```

5. **Test Bulk Fetch (Free Tier Feature)**
   ```
   ✓ Scroll to "Bulk Operations" section
   ✓ Click "Fetch All Prices (1 API call)"
   ✓ Confirm Data sheet created/updated with all commodities
   ✓ Verify usage counter increments by 1 only (not 20+)
   ✓ Check status message: "✓ Successfully fetched X prices in 1 API call"
   ```

**Expected Analytics Events:**
- `Add-in Opened`
- `API Key Saved`
- `Paywall Shown` (feature: historical_data)
- `Prices Fetched` (count: 3)
- `Bulk Fetch All` (count: 20+)

---

### Scenario 2: Paid Tier User (Exploration Tier)

**Setup:**
- API Key: Use Exploration tier account ($15/mo, 10,000 requests/month)
- Expected Behavior: Historical data features fully accessible

**Test Steps:**

1. **Load Add-in with Paid API Key**
   ```
   ✓ Clear localStorage (F12 → Application → Local Storage → Clear All)
   ✓ Reload add-in
   ✓ Enter Exploration tier API key
   ✓ Click "Save"
   ✓ Wait for validation success
   ```

2. **Verify Feature UI Displayed (Not Paywall)**
   ```
   ✓ Scroll to "Historical Data" section
   ✓ Confirm tier gate is HIDDEN
   ✓ Confirm commodity dropdown is VISIBLE
   ✓ Confirm "Fetch Past Year" button is VISIBLE
   ✓ Confirm "Fetch Past Month" button is VISIBLE
   ✓ Confirm help text: "Rate limited to 1 fetch per commodity per hour"
   ```

3. **Test Fetch Past Year**
   ```
   ✓ Select commodity: "Brent Crude Oil"
   ✓ Click "Fetch Past Year"
   ✓ Wait for API call (may take 5-10 seconds)
   ✓ Confirm new sheet created: "Past Year"
   ✓ Verify sheet contains:
     - Column A: Date (sorted oldest → newest)
     - Column B: Price (formatted as $X.XX)
     - Column C: Currency (USD)
     - Column D: Commodity (BRENT_CRUDE_USD)
   ✓ Verify ~365 rows of data
   ✓ Verify dates span approximately 1 year
   ✓ Check status message: "✓ Successfully fetched X historical data points"
   ```

4. **Test Rate Limiting**
   ```
   ✓ Immediately click "Fetch Past Year" again for Brent
   ✓ Confirm error message: "You can fetch historical data for each commodity once per hour"
   ✓ Check browser console for analytics event:
     - Event: "Rate Limit Hit"
     - Props: { feature: 'historical_data', commodity: 'BRENT_CRUDE_USD' }
   ```

5. **Test Fetch Past Month (Different Commodity)**
   ```
   ✓ Change commodity dropdown to "WTI Crude"
   ✓ Click "Fetch Past Month"
   ✓ Confirm new sheet created: "Past Month"
   ✓ Verify sheet contains ~30 rows of WTI data
   ✓ Verify dates span approximately 1 month
   ```

**Expected Analytics Events:**
- `Add-in Opened`
- `API Key Saved`
- `Historical Data Fetched` (commodity: BRENT_CRUDE_USD, period: past_year, count: 365)
- `Rate Limit Hit` (feature: historical_data, commodity: BRENT_CRUDE_USD)
- `Historical Data Fetched` (commodity: WTI_USD, period: past_month, count: 30)

---

### Scenario 3: Upgrade Flow (Free → Paid)

**Setup:**
- Start with free tier API key
- Simulate upgrade decision journey

**Test Steps:**

1. **Free User Discovers Paywall**
   ```
   ✓ Load add-in with free API key
   ✓ Scroll to "Historical Data" section
   ✓ See purple gradient tier gate
   ✓ Read benefits list
   ```

2. **User Clicks Upgrade Button**
   ```
   ✓ Click "Upgrade to Exploration ($15/mo)"
   ✓ Pricing page opens in new tab
   ✓ Check analytics event: "Paywall Shown"
   ```

3. **User Completes Upgrade (External)**
   ```
   ✓ [External] User completes Stripe checkout
   ✓ [External] Subscription created in backend
   ✓ [External] User plan updated: free → exploration
   ```

4. **User Returns to Excel**
   ```
   ✓ Close and reopen add-in (or refresh)
   ✓ Settings still show same API key
   ✓ Tier gate should now be HIDDEN
   ✓ Feature UI should now be VISIBLE
   ✓ Test "Fetch Past Year" - should work
   ```

5. **Verify Conversion Tracking**
   ```
   ✓ Check Plausible Analytics (https://plausible.io/excel.oilpriceapi.com)
   ✓ Verify funnel:
     - Add-in Opened
     → Paywall Shown
     → [External] Upgrade Clicked
     → [External] Stripe checkout completed
   ```

**Expected Conversion Rate:** 15% of users who see paywall

---

### Scenario 4: Error Handling & Edge Cases

**Test Steps:**

1. **Invalid API Key**
   ```
   ✓ Enter invalid API key: "invalid_key_12345"
   ✓ Click "Save"
   ✓ Confirm error: "Invalid API key. Please check and try again."
   ✓ Verify tier gate remains hidden (no tier data available)
   ```

2. **Network Offline**
   ```
   ✓ Open browser DevTools (F12)
   ✓ Network tab → Throttling → Offline
   ✓ Click "Fetch Prices"
   ✓ Confirm error: "Unable to connect to the API server."
   ✓ Check analytics: "Error Occurred" (error: Network Failed)
   ✓ Re-enable network
   ```

3. **No Commodity Selected (Historical)**
   ```
   ✓ Paid tier API key loaded
   ✓ Don't select any commodity in dropdown
   ✓ Click "Fetch Past Year"
   ✓ Confirm error: "Please select a commodity"
   ```

4. **Rapid Clicking (Duplicate Requests)**
   ```
   ✓ Select commodity: "Natural Gas (US)"
   ✓ Rapidly click "Fetch Past Year" 5 times
   ✓ Verify only 1 API request is made (check Network tab)
   ✓ Verify only 1 sheet is created
   ✓ No duplicate data
   ```

5. **Empty Historical Data Response**
   ```
   ✓ [Requires backend mock] Simulate empty data array
   ✓ Confirm error: "No historical data available"
   ✓ No Excel sheet created
   ```

6. **Expired API Key**
   ```
   ✓ Use API key from canceled subscription
   ✓ Click "Fetch Prices"
   ✓ Confirm error: "Your API key is invalid or expired."
   ✓ Recovery action: "Please update your API key in Settings."
   ```

---

### Scenario 5: Analytics Validation

**Tool:** Browser Console (F12 → Console)

**Events to Verify:**

1. **Add-in Lifecycle**
   ```javascript
   plausible('Add-in Opened')
   // Fires on: Office.onReady()
   ```

2. **API Key Management**
   ```javascript
   plausible('API Key Saved')
   plausible('API Key Invalid')
   // Fires on: saveApiKey() success/failure
   ```

3. **Paywall Engagement**
   ```javascript
   plausible('Paywall Shown', { props: { feature: 'historical_data' } })
   // Fires on: checkUserTierAndShowFeatures() when tier.canAccessHistorical = false
   ```

4. **Feature Usage**
   ```javascript
   plausible('Prices Fetched', { props: { commodities: 'BRENT,WTI', count: 2 } })
   plausible('Bulk Fetch All', { props: { count: 23 } })
   plausible('Historical Data Fetched', { props: { commodity: 'BRENT_CRUDE_USD', period: 'past_year', count: 365 } })
   plausible('Converted to MBtu')
   ```

5. **Upgrade Intent**
   ```javascript
   plausible('Upgrade Required Shown', { props: { feature: 'historical_data', commodity: 'BRENT_CRUDE_USD' } })
   plausible('Upgrade Clicked', { props: { source: 'upgrade_prompt' } })
   // Fires on: showUpgradePrompt() when user clicks OK
   ```

6. **Rate Limiting**
   ```javascript
   plausible('Rate Limit Hit', { props: { feature: 'historical_data', commodity: 'BRENT_CRUDE_USD' } })
   // Fires on: getPastYear() returns 429 status
   ```

7. **Errors**
   ```javascript
   plausible('Error Occurred', { props: { error: 'Fetch Prices Failed' } })
   plausible('Error Occurred', { props: { error: 'Historical Fetch Failed' } })
   plausible('Error Occurred', { props: { error: 'Bulk Fetch Failed' } })
   ```

**Verification Steps:**
```
✓ Open browser console (F12)
✓ Filter for "plausible" in console
✓ Perform action (e.g., click "Fetch Past Year")
✓ Confirm console.log shows event fired
✓ Check Plausible dashboard for event count
```

---

### Scenario 6: Cross-Platform Testing

**Platforms to Test:**

1. **Excel Desktop (Windows)**
   ```
   ✓ Windows 11 + Excel 2021
   ✓ All features work
   ✓ Tier gate displays correctly
   ✓ Historical sheets created
   ```

2. **Excel Desktop (Mac)**
   ```
   ✓ macOS Sonoma + Excel 2021
   ✓ All features work
   ✓ Keyboard shortcuts work (Cmd+P)
   ```

3. **Excel Online (Chrome)**
   ```
   ✓ Chrome browser
   ✓ Log in to office.com
   ✓ Open blank workbook
   ✓ Insert → Office Add-ins → Upload manifest
   ✓ Test all features
   ```

4. **Excel Online (Edge)**
   ```
   ✓ Edge browser
   ✓ Same workflow as Chrome
   ✓ Verify no browser-specific issues
   ```

---

## 📊 Success Criteria

### Functional Requirements
- [ ] Free tier users see tier gate (paywall)
- [ ] Paid tier users see feature UI
- [ ] Historical data fetches correctly (365+ data points)
- [ ] Rate limiting works (1 fetch/hour per commodity)
- [ ] Bulk fetch reduces API usage (1 call vs N calls)
- [ ] Upgrade button opens pricing page
- [ ] All Excel sheets created with proper formatting

### Pricing Protection
- [ ] Free users CANNOT access historical data
- [ ] Free users CANNOT bypass tier gate
- [ ] Rate limiting prevents abuse
- [ ] Backend returns 403 for unauthorized requests
- [ ] Client checks tier before making requests

### User Experience
- [ ] Tier gate is visually appealing (gradient design)
- [ ] Error messages are clear and actionable
- [ ] Upgrade prompts explain value proposition
- [ ] Loading states show progress
- [ ] No duplicate API requests

### Analytics
- [ ] All 12 events tracked correctly
- [ ] Event props include relevant data
- [ ] Plausible dashboard shows events
- [ ] Conversion funnel trackable

### Performance
- [ ] Add-in loads in < 3 seconds
- [ ] Tier check completes in < 1 second
- [ ] Historical data fetch < 10 seconds
- [ ] Bulk fetch faster than individual fetches
- [ ] No memory leaks or performance degradation

---

## 🐛 Known Issues & Workarounds

### Issue 1: First-run Tier Check Timing
**Problem:** Tier check may not complete before user scrolls to historical section
**Workaround:** Add loading spinner to historical section while tier is being checked
**Priority:** P2 (minor UX issue)

### Issue 2: Rate Limit Timer Not Displayed
**Problem:** User doesn't know when they can fetch again
**Enhancement:** Show "Available in 47 minutes" countdown
**Priority:** P3 (nice-to-have)

### Issue 3: Offline Detection
**Problem:** Generic network error when offline
**Enhancement:** Detect navigator.onLine and show offline-specific message
**Priority:** P3 (edge case)

---

## 📈 Metrics to Monitor (Post-Launch)

### Day 1-7 Metrics
- **Add-in Opens:** Target 100+
- **Paywall Shows:** Target 50+ (50% engagement)
- **Upgrade Clicks:** Target 10+ (20% click-through)
- **Historical Fetches:** Target 20+ (paid users)
- **Bulk Fetches:** Target 100+ (efficiency adoption)

### Week 2-4 Metrics
- **Conversion Rate:** Target 15% (paywall → paid)
- **Churn Rate:** Target < 5% (monthly)
- **Average Fetches per User:** Target 50+
- **Rate Limit Hits:** Target < 10% of users (indicates healthy usage)

### Red Flags (Immediate Investigation)
- 🚩 Conversion rate < 5% → Paywall messaging unclear
- 🚩 Churn rate > 20% → Value proposition weak
- 🚩 Rate limit hits > 50% of users → Limits too restrictive
- 🚩 Bulk fetch adoption < 30% → Feature not discoverable
- 🚩 Error rate > 5% → Backend issues or UI bugs

---

## ✅ Testing Sign-off Checklist

**Tester:** _______________
**Date:** _______________
**Build:** 74b793f (Walk phase)

**Free Tier Testing:**
- [ ] Tier gate displays correctly
- [ ] Upgrade button opens pricing page
- [ ] Latest prices work
- [ ] Bulk fetch works
- [ ] Analytics track paywall engagement

**Paid Tier Testing:**
- [ ] Feature UI displays (no tier gate)
- [ ] Past year fetch works
- [ ] Past month fetch works
- [ ] Rate limiting works
- [ ] Historical sheets formatted correctly

**Error Handling:**
- [ ] Invalid API key handled
- [ ] Network errors handled
- [ ] Rate limit errors handled
- [ ] Empty commodity selection handled

**Analytics:**
- [ ] All 12 events fire correctly
- [ ] Event props are accurate
- [ ] Plausible dashboard shows events

**Cross-Platform:**
- [ ] Excel Desktop (Windows) works
- [ ] Excel Desktop (Mac) works
- [ ] Excel Online (Chrome) works
- [ ] Excel Online (Edge) works

**Performance:**
- [ ] Add-in loads < 3 seconds
- [ ] Tier check completes < 1 second
- [ ] Historical fetch < 10 seconds
- [ ] No memory leaks

**Sign-off:** _______________
**Notes:** _______________

---

## 🚀 Post-Testing Actions

1. **If All Tests Pass:**
   - ✅ Mark Walk phase as production-ready
   - ✅ Update AppSource screenshots to include historical section
   - ✅ Prepare marketing announcement (LinkedIn, email)
   - ✅ Monitor analytics for first 7 days

2. **If Critical Issues Found:**
   - 🔴 Create GitHub issues for each bug
   - 🔴 Prioritize by severity (P0 = blocks launch)
   - 🔴 Fix P0 issues before marketing push
   - 🔴 Re-test after fixes

3. **If Minor Issues Found:**
   - 🟡 Document in GitHub issues
   - 🟡 Prioritize for next sprint
   - 🟡 Proceed with launch (not blockers)

---

**Testing Status:** 🟡 Pending Manual Testing
**Next Action:** Perform testing scenarios 1-6 and complete sign-off checklist
