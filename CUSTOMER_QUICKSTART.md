# OilPrice Excel Add-in — 2-Minute Setup

Live oil, gas, and fuel prices in your spreadsheet, as a formula:

```excel
=OILPRICE.PRICE("BRENT_CRUDE_USD")
```

You need: an [OilPriceAPI account](https://www.oilpriceapi.com/auth/signup) and your API key (Dashboard → API Keys → Copy).

Pick the option that matches how you use Excel. **Option 1 is the fastest and works on any computer.**

---

## Option 1 — Excel on the web (recommended, no install, ~2 minutes)

1. Download the add-in file: **[manifest.xml](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml)** (right-click → _Save link as…_ if it opens in the browser).
2. Go to [office.com](https://www.office.com), sign in, and open your workbook in **Excel**.
3. On the **Home** tab, click **Add-ins** → **More Add-ins**.
4. Choose the **My Add-ins** tab → **Upload My Add-in** (top-left corner of the dialog).
5. Browse to the `manifest.xml` you downloaded and click **Upload**.
6. The **OilPrice** button appears on your ribbon. Click it, paste your API key in the task pane, click **Save Key**, then **Test Key**.
7. In any cell, type:

   ```excel
   =OILPRICE.PRICE("BRENT_CRUDE_USD")
   ```

That's it. The formula recalculates on refresh, and you can point it at a cell: `=OILPRICE.PRICE(A1)`.

---

## Option 2 — Excel desktop on Windows

Two ways, depending on your setup:

### 2a. Your company uses Microsoft 365 (easiest for desktop)

If you (or your IT admin) can open the Microsoft 365 admin center, this deploys the add-in properly to desktop Excel — no scripts, no registry:

1. Go to [admin.microsoft.com](https://admin.microsoft.com) → **Settings** → **Integrated apps**.
2. Click **Upload custom apps** → app type **Office Add-in**.
3. Choose **Provide link to manifest file** and paste:

   ```text
   https://oilpriceapi.github.io/excel-energy-addin/manifest.xml
   ```

4. Assign it to yourself (or _Entire organization_), accept, and finish.
5. Restart Excel. The **OilPrice** add-in appears automatically (allow up to a few hours the first time).

### 2b. One-click script (personal machine, admin rights)

1. Download **[install-windows.cmd](https://raw.githubusercontent.com/OilpriceAPI/excel-energy-addin/main/scripts/install-windows.cmd)** (right-click → _Save link as…_).
2. Double-click it and choose **Yes** on the administrator prompt.
3. When the window says it's done, restart Excel.
4. In Excel: **Insert** → **My Add-ins** → **Shared Folder** tab → **OilPrice**.

---

## Option 3 — Excel desktop on Mac

Paste this one line into Terminal, then restart Excel:

```bash
mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef && curl -fsSL https://oilpriceapi.github.io/excel-energy-addin/manifest.xml -o ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/oilprice-manifest.xml
```

Then in Excel: **Insert** → **My Add-ins** → the **OilPrice** add-in is listed under Developer Add-ins.

---

## First formulas to try

```excel
=OILPRICE.PRICE("BRENT_CRUDE_USD")     ' latest Brent price
=OILPRICE.PRICE("WTI_USD")             ' latest WTI price
=OILPRICE.PRICE(A1)                    ' code from a cell — recalculates when A1 changes
=OILPRICE.CODES()                      ' list every supported commodity code
```

## If something looks wrong

- **The task pane is blank** → close Excel fully and reopen; on the web, remove and re-upload the manifest.
- **`#VALUE!` from every formula** → you may have an old manifest cached. Re-download `manifest.xml` (fixes shipped recently) and repeat the upload step.
- **Where's my API key?** → [Dashboard → API Keys](https://www.oilpriceapi.com/dashboard).
- Stuck? Email [support@oilpriceapi.com](mailto:support@oilpriceapi.com) — a human reads it.
