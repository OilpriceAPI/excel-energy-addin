# OilPrice Excel Add-in Preview Setup

This preview path is tested on Mac Excel 16.110.2. Microsoft AppSource distribution and other platform claims are still pending.

You need an [OilPriceAPI account](https://www.oilpriceapi.com/auth/signup), an API key from the [API Keys dashboard](https://www.oilpriceapi.com/dashboard), and a current Microsoft Excel installation for Mac.

## Install on Mac Excel

Run this command in Terminal, then restart Excel:

```bash
mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef && curl -fsSL https://oilpriceapi.github.io/excel-energy-addin/manifest.xml -o ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/oilprice-manifest.xml
```

In Excel, open **Insert > My Add-ins**, select the OilPrice developer add-in, and open the **OilPrice** pane. Save the API key and choose **Test Key**.

## Verify Source Context

Start with these formulas:

```excel
=OILPRICE.PRICE("BRENT_CRUDE_USD")
=OILPRICE.INFO("BRENT_CRUDE_USD")
=OILPRICE.STATUS("BRENT_CRUDE_USD")
=OILPRICE.UNIT("BRENT_CRUDE_USD")
```

`PRICE` is numeric. `INFO` supplies the API-returned unit, source, source timestamp, and freshness fields needed to interpret that number. Refresh timing is controlled by Excel recalculation and API availability; data cadence varies by source, market hours, dataset, and account entitlement.

## Recovery

- `#AUTH_REQUIRED` or `#AUTH_INVALID`: open the OilPrice pane and save a current key.
- `#UPGRADE_REQUIRED`: review the account's dataset and endpoint entitlement.
- `#RATE_LIMITED`: wait before recalculating.
- `#TIMEOUT`, `#NETWORK_OR_CORS`, or `#SERVER_ERROR`: check [OilPriceAPI status](https://status.oilpriceapi.com), retry once, then copy diagnostics from the pane.
- `#NO_DATA` or `#INVALID_RESPONSE`: copy diagnostics and contact [support@oilpriceapi.com](mailto:support@oilpriceapi.com). Never send the API key.

Current product scope and mutable facts are published in the [reviewed product-facts contract](https://api.oilpriceapi.com/product-facts.json).
