# Quick Install (2 minutes)

## Excel Online

1. Open [Excel Online](https://www.office.com/launch/excel)
2. **Insert** > **Office Add-ins** > **Upload My Add-in**
3. Upload [this manifest.xml](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml)
4. Click **Show Prices** in the Home ribbon, enter your API key, done!

## Excel Desktop (Windows)

1. [Download manifest.xml](https://oilpriceapi.github.io/excel-energy-addin/manifest.xml) to `C:\ExcelAddins\`
2. In Excel: **File** > **Options** > **Trust Center** > **Trust Center Settings** > **Trusted Add-in Catalogs** > add `C:\ExcelAddins\` > check **Show in Menu** > **OK**
3. Restart Excel, then **Insert** > **My Add-ins** > **Shared Folder** > **Energy Price Comparison**

## Try It

```
=OILPRICE("BRENT_CRUDE_USD")    → current Brent price
=OILPRICE("WTI_USD")            → current WTI price
=DIESEL_PRICE("TX")             → Texas diesel average
```

Get your free API key at [oilpriceapi.com](https://www.oilpriceapi.com).

Full instructions: [INSTALL.md](INSTALL.md)
