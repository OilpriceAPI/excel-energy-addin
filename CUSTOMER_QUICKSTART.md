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

For structured datasets, use the allowlisted `GET` helper:

```excel
=OILPRICE.GET("/v1/ei/oil_inventories/latest")
=OILPRICE.GET("/v1/storage/cushing")
=OILPRICE.GET("/v1/bunker-fuels/all")
=OILPRICE.GET("/v1/ei/well-permits/preview")
```

Nested API fields become dot-named worksheet fields or columns, so values
remain usable in formulas and charts rather than appearing as JSON blobs.
Access to each dataset depends on the API key's current entitlements.

## Recovery

- `#AUTH_REQUIRED` or `#AUTH_INVALID`: open the OilPrice pane and save a current key.
- `#UPGRADE_REQUIRED`: review the account's dataset and endpoint entitlement.
- `#API_ACCESS_SUSPENDED`: contact [OilPriceAPI support](https://www.oilpriceapi.com/support); do not rotate the key or assume an upgrade will restore access.
- `#EMAIL_CONFIRMATION_REQUIRED`: use the trusted OilPriceAPI confirmation recovery link shown in the formula error.
- `#ACCESS_DENIED`: run **Test Key**, then contact support if the reason remains unknown.
- `#RATE_LIMITED`: follow the retry time in the formula error, then retry.
- `#TIMEOUT`, `#NETWORK_OR_CORS`, or `#SERVER_ERROR`: check [OilPriceAPI status](https://status.oilpriceapi.com), retry once, then copy diagnostics from the pane.
- `#NO_DATA` or `#INVALID_RESPONSE`: copy diagnostics and contact [support@oilpriceapi.com](mailto:support@oilpriceapi.com). Never send the API key.

Current product scope and mutable facts are published in the [product-facts contract](https://api.oilpriceapi.com/product-facts.json).
