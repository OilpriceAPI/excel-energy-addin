# AppSource Metadata

Status: internal submission candidate; not submitted and not available in AppSource.

Recheck all mutable listing claims against the currently published typed [OilPriceAPI product-facts contract](https://api.oilpriceapi.com/product-facts.json) immediately before submission. Record the observed contract version in the submission receipt rather than hardcoding it in customer copy.

## Listing Copy

Product name: `OilPrice Excel Add-in`

Short description: `OilPriceAPI worksheet formulas with an Excel task pane API-key manager.`

Long description:

> The OilPrice Excel Add-in adds supported OilPriceAPI worksheet formulas to Excel. Save an OilPriceAPI key in the task pane, then use focused formulas for price and allowlisted endpoint lookups. `OILPRICE.INFO` includes the API-returned currency, unit, source, source timestamp, and freshness fields. An OilPriceAPI account and API key are required. Dataset access, endpoint access, quotas, and limits depend on the account.

Additional purchase disclosure:

> An OilPriceAPI account and API key are required. API access and limits are governed by the user's OilPriceAPI account and the current product-facts contract.

## URLs

- Support: https://www.oilpriceapi.com/tools/excel-support
- Privacy: https://oilpriceapi.github.io/excel-energy-addin/privacy.html
- Terms: https://www.oilpriceapi.com/terms
- Product facts: https://api.oilpriceapi.com/product-facts.json

## Proven Platform

Mac Excel 16.110.2 on macOS passed preview sideload, key save/test, `PRICE`, `GET`, referenced-cell recalculation, and diagnostics checks on 2026-07-03. No other platform is claimed in the candidate listing until a clean runtime receipt exists.

## Submission Gate

Before submission, attach:

1. The exact submitted manifest, its actual `<Version>`, source commit, build workflow run, and SHA-256 checksum, plus a manifest validation receipt. The source `manifest.xml` version is a semantic template; it is not proof of the cache-busted `dist/manifest.xml` version.
2. Hosted asset HTTP checks for the exact release SHA.
3. Screenshots from a smoke-proven platform with no API key or customer data.
4. A restricted non-customer reviewer key delivered only through the private Partner Center field.
5. Product and support approval for the text above.

Do not describe the add-in as AppSource-available until Microsoft approval and a public listing URL exist.
