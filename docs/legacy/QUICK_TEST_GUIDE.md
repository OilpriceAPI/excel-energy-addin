# Quick Test Guide: Energy Price Comparison Add-in

**You're at:** Energy Price Comparison box just appeared in Excel Online ✅

---

## 🧪 Step-by-Step Testing (5 Minutes)

### Step 1: Open the Taskpane (10 seconds)

**You should see:**
- A box that says "Energy Price Comparison"
- Click on it to open the taskpane panel on the right side of Excel

**What you'll see:**
- Welcome modal with 3-step onboarding
- Click "Get Started" to dismiss the welcome screen

---

### Step 2: Enter Your API Key (30 seconds)

**In the taskpane:**

1. **Scroll down to "Settings" section**
   - You'll see an input field labeled "API Key"

2. **Enter your admin API key:**
   ```
   [REDACTED - do not commit API keys]
   ```

3. **Click "Save"**
   - Should see: ✓ "API key saved successfully"

4. **Click "Test Connection"** (optional)
   - Should see: ✓ "Connection successful"

**What this does:**
- Validates your API key with the backend
- Stores it in browser localStorage
- Detects your tier (you have admin access = all features unlocked)

---

### Step 3: Fetch Latest Prices (1 minute)

**In the taskpane:**

1. **Scroll to "Actions" section**
   - You'll see commodity checkboxes

2. **Select a few commodities:**
   - ☑ Brent Crude Oil
   - ☑ WTI Crude Oil
   - ☑ Natural Gas (US)

3. **Click "Fetch Prices"** (or press Ctrl+P)
   - You'll see a loading indicator
   - Wait 2-3 seconds

**What should happen:**
- ✅ A new Excel sheet appears named "Data"
- ✅ Sheet contains a table with columns:
  - Commodity | Price | Unit | Currency | Timestamp
- ✅ Example row:
  ```
  Brent Crude Oil | 82.30 | barrel | USD | 2025-11-29 14:00:00
  ```
- ✅ Usage counter updates (e.g., "3 / 999,999,999 requests")

**If you see the Data sheet with prices: ✅ Success!**

---

### Step 4: Convert to MBtu (30 seconds)

**In the taskpane:**

1. **Scroll to "Actions" section**
2. **Click "Convert to MBtu"**
   - Wait 1-2 seconds

**What should happen:**
- ✅ A new Excel sheet appears named "Process"
- ✅ Sheet contains standardized prices:
  ```
  | Commodity       | Original Price | Unit   | $/MBtu |
  |-----------------|----------------|--------|--------|
  | Brent Crude Oil | $82.30         | barrel | $14.19 |
  | WTI             | $78.45         | barrel | $13.53 |
  | Natural Gas     | $2.45          | MBtu   | $2.45  |
  ```

**This shows:**
- All energy prices normalized to $/MBtu
- Easy to compare apples-to-apples (crude vs gas vs coal)
- No manual calculations needed

**If you see the Process sheet: ✅ Success!**

---

### Step 5: Test Historical Data (1 minute) - PAID FEATURE

**In the taskpane:**

1. **Scroll to "Historical Data" section**

   **What you should see (with admin key):**
   - ✅ Commodity dropdown (visible)
   - ✅ "Fetch Past Year" button (visible)
   - ✅ "Fetch Past Month" button (visible)
   - ❌ NO purple paywall gradient (admin has full access)

2. **Select a commodity from dropdown:**
   - Choose "Brent Crude Oil"

3. **Click "Fetch Past Year"**
   - Wait 5-10 seconds (larger dataset)

**What should happen:**
- ✅ New sheet appears named "Past Year"
- ✅ Sheet contains ~365 rows of historical data
- ✅ Columns: Date | Price | Currency | Commodity
- ✅ Dates are sorted oldest → newest
- ✅ Example:
  ```
  2024-11-29 | 82.30 | USD | BRENT_CRUDE_USD
  2024-11-28 | 81.95 | USD | BRENT_CRUDE_USD
  2024-11-27 | 82.10 | USD | BRENT_CRUDE_USD
  ```

**If you see historical data: ✅ Success!**

**Rate Limiting Test:**
- Try clicking "Fetch Past Year" again for Brent
- Should see error: "You can fetch historical data for each commodity once per hour"
- This prevents abuse

---

### Step 6: Test Bulk Operations (30 seconds)

**In the taskpane:**

1. **Scroll to "Bulk Operations" section**
2. **Click "Fetch All Prices (1 API call)"**
   - Wait 3-5 seconds

**What should happen:**
- ✅ Data sheet updates with ALL 20+ commodities
- ✅ Usage counter increments by 1 only (not 20+)
- ✅ Status message: "✓ Successfully fetched X prices in 1 API call"

**Why this matters:**
- Saves API quota (1 request vs 20+ requests)
- Faster for users who want everything
- Shows in usage: "4 / 999,999,999" (only +1)

**If all commodities appear: ✅ Success!**

---

## ✅ Testing Checklist

**Basic Features:**
- [ ] Welcome modal appears on first load
- [ ] API key input and save works
- [ ] Test connection succeeds
- [ ] Fetch prices creates Data sheet
- [ ] Convert to MBtu creates Process sheet
- [ ] Usage counter displays and increments

**Premium Features (Admin Key):**
- [ ] Historical data section shows (no paywall)
- [ ] Fetch Past Year creates sheet with ~365 rows
- [ ] Fetch Past Month creates sheet with ~30 rows
- [ ] Rate limiting works (1 fetch/hour per commodity)

**Bulk Operations:**
- [ ] Fetch All Prices works (1 API call)
- [ ] All commodities appear in Data sheet
- [ ] Usage counter only increments by 1

**Error Handling:**
- [ ] Invalid API key shows error
- [ ] Empty commodity selection shows error
- [ ] Rate limit hit shows clear message

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid API key"
**Solution:** Make sure you copied the full key:
```
[REDACTED - do not commit API keys]
```

### Issue: "Network error"
**Solution:**
- Check your internet connection
- Try again in 10 seconds
- Open browser console (F12) and check for CORS errors

### Issue: Taskpane is blank
**Solution:**
- Reload Excel Online page
- Re-upload manifest.xml
- Check browser console for JavaScript errors

### Issue: Sheets not appearing
**Solution:**
- Look at the sheet tabs at the bottom of Excel
- Click on "Data" or "Process" tabs
- They might be created but not auto-selected

### Issue: Historical data shows paywall (shouldn't with admin key)
**Solution:**
- Delete API key and re-enter
- Click "Test Connection" to refresh tier detection
- Check that /users/me endpoint returns correct tier

---

## 📸 What to Screenshot for AppSource

While testing, take screenshots of:

1. **Welcome Modal** - First-time user experience
2. **Settings Section** - API key input (use demo key, not real one)
3. **Actions Section** - Commodity checkboxes selected
4. **Data Sheet** - Table with prices
5. **Process Sheet** - MBtu conversion table

**Screenshot specs:**
- Resolution: 1366x768
- Format: PNG
- Tool: Windows Snipping Tool or Mac Screenshot (Cmd+Shift+4)

---

## 🎥 What to Record for Demo Video

**60-second script:**
1. (0-10s) Show Excel with blank workbook
2. (10-20s) Insert add-in from AppSource
3. (20-35s) Enter API key and save
4. (35-50s) Select commodities and fetch prices
5. (50-65s) Convert to MBtu and show comparison
6. (65-75s) Show usage counter and both sheets

---

## 🎯 Success Criteria

**You should see:**
- ✅ Data sheet with 3+ commodity prices
- ✅ Process sheet with $/MBtu conversions
- ✅ Past Year sheet with 365 rows (if tested)
- ✅ Usage counter showing requests used
- ✅ No errors in browser console (F12)

**If all 5 items above work: Your add-in is production-ready!** 🎉

---

## 🚀 Next Steps After Testing

**If everything works:**
1. ✅ Take 5 screenshots (15 min)
2. ✅ Record demo video (30 min)
3. ✅ Submit to AppSource (20 min)

**If something doesn't work:**
1. Open browser console (F12 → Console tab)
2. Screenshot any error messages
3. Check network tab for failed API calls
4. Report issues to: support@oilpriceapi.com

---

## 🆘 Quick Troubleshooting

**Right now in Excel:**
1. Press F12 to open browser console
2. Go to Console tab
3. Look for any red errors
4. Go to Network tab
5. Click "Fetch Prices" again
6. Look for any failed requests (red)

**If you see errors:**
- Copy the error message
- Check if it's a CORS issue
- Verify API endpoint is responding

---

## 📞 Support

**Having issues?**
- Email: support@oilpriceapi.com
- GitHub: https://github.com/OilpriceAPI/excel-energy-addin/issues
- Documentation: https://www.oilpriceapi.com/tools/excel-support

---

**Current Status:** Testing in Excel Online
**Next Action:** Follow steps 1-6 above
**Expected Time:** 5 minutes

Let me know what happens when you click on the Energy Price Comparison box! 🚀
