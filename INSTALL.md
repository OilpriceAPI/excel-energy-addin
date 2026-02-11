# Installing the Energy Price Comparison Add-in

## Prerequisites

- Microsoft Excel (2016 or later, or Excel Online)
- An OilPriceAPI key ([get one free](https://www.oilpriceapi.com))

---

## Option A: Excel Online (Easiest)

1. Open [Excel Online](https://www.office.com/launch/excel) and create or open a workbook
2. Click **Insert** > **Office Add-ins** > **Upload My Add-in**
3. Enter this manifest URL or upload the file from:
   ```
   https://oilpriceapi.github.io/excel-energy-addin/manifest.xml
   ```
4. Click **Upload** — the add-in appears in the **Home** ribbon

> If "Upload My Add-in" asks for a file, [download the manifest](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml) first, then upload it.

---

## Option B: Excel Desktop (Windows)

### Sideload via Shared Folder Catalog

1. Create a folder for add-in manifests, e.g. `C:\ExcelAddins\`
2. [Download the manifest.xml](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml) and save it to that folder
3. In Excel, go to **File** > **Options** > **Trust Center** > **Trust Center Settings**
4. Click **Trusted Add-in Catalogs**
5. In "Catalog Url", enter `C:\ExcelAddins\` and click **Add Catalog**
6. Check the **Show in Menu** checkbox, click **OK**, then **OK** again
7. Restart Excel
8. Go to **Insert** > **My Add-ins** > **Shared Folder** tab
9. Select **Energy Price Comparison** and click **Add**

### Sideload via Upload (Microsoft 365)

1. In Excel, go to **Insert** > **Get Add-ins** > **My Add-ins**
2. Click **Upload My Add-in** (top right corner)
3. Browse to the downloaded `manifest.xml` file
4. Click **Upload**

---

## Option C: Excel Desktop (Mac)

1. [Download the manifest.xml](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml)
2. Save it to `~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/`
   - Create the `wef` folder if it doesn't exist
3. Restart Excel
4. The add-in will appear under **Insert** > **My Add-ins**

---

## First-Time Setup

Once the add-in is loaded:

1. Click **Show Prices** in the Home ribbon to open the panel
2. Enter your OilPriceAPI key in the Settings section
3. Click **Save**, then **Test Connection** to verify
4. Select commodities and click **Fetch Prices**

---

## Using Custom Functions

Type these directly in any cell:

| Function                              | Example                                                    | Description                    |
| ------------------------------------- | ---------------------------------------------------------- | ------------------------------ |
| `=OILPRICE(code)`                     | `=OILPRICE("BRENT_CRUDE_USD")`                             | Current price (auto-refreshes) |
| `=OILPRICE.HISTORY(code, start, end)` | `=OILPRICE.HISTORY("WTI_USD", "2025-01-01", "2025-12-31")` | Historical prices as table     |
| `=OILPRICE.CONVERT(code, from, to)`   | `=OILPRICE.CONVERT("BRENT_CRUDE_USD", "barrel", "MBtu")`   | Unit conversion                |
| `=OILPRICE_AVG(code, days)`           | `=OILPRICE_AVG("WTI_USD", 30)`                             | N-day average price            |
| `=OILPRICE_MIN(code)`                 | `=OILPRICE_MIN("NATURAL_GAS_USD")`                         | Minimum price                  |
| `=OILPRICE_MAX(code)`                 | `=OILPRICE_MAX("NATURAL_GAS_USD")`                         | Maximum price                  |
| `=DIESEL_PRICE(state)`                | `=DIESEL_PRICE("TX")`                                      | US state diesel average        |

---

## Common Commodity Codes

| Code              | Commodity               |
| ----------------- | ----------------------- |
| `BRENT_CRUDE_USD` | Brent Crude Oil         |
| `WTI_USD`         | WTI Crude Oil           |
| `NATURAL_GAS_USD` | Natural Gas (Henry Hub) |
| `HEATING_OIL_USD` | Heating Oil             |
| `DIESEL_USD`      | Diesel                  |
| `GASOLINE_USD`    | Gasoline                |
| `COAL_USD`        | Coal                    |
| `PROPANE_USD`     | Propane                 |

For the full list of 100+ commodity codes, visit [docs.oilpriceapi.com](https://docs.oilpriceapi.com).

---

## Troubleshooting

### Add-in doesn't appear in ribbon

- Make sure you restarted Excel after adding the manifest
- Check that the catalog folder is correctly configured in Trust Center

### "Could not connect" error

- Verify your API key is correct
- Check your internet connection
- Try the **Test Connection** button in the panel

### Functions return #ERROR

- Ensure your API key is saved in the panel settings
- Check that the commodity code is valid (see table above)
- `#UPGRADE_REQUIRED` means the feature needs a paid plan

### Need help?

- Documentation: [docs.oilpriceapi.com](https://docs.oilpriceapi.com)
- Email: support@oilpriceapi.com
- Issues: [GitHub](https://github.com/OilpriceAPI/excel-energy-addin/issues)
