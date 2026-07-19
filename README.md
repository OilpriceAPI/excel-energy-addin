# OilPrice Excel Add-in

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)

This repository contains the preview OilPrice Excel add-in for refreshable OilPriceAPI formulas. It is not yet listed in Microsoft AppSource.

Product facts are governed by the [versioned OilPriceAPI contract](https://api.oilpriceapi.com/product-facts.json), reviewed 2026-07-18. Latest available values include source timestamps; cadence varies by source, market hours, dataset, and account entitlement.

## Formula Contract

- `=OILPRICE.PRICE("BRENT_CRUDE_USD")` returns the numeric price from the latest available API record.
- `=OILPRICE.INFO("BRENT_CRUDE_USD")` returns price, currency, unit, source, source description, source timestamp, and freshness fields.
- `=OILPRICE.STATUS("BRENT_CRUDE_USD")` returns the API freshness state.
- `=OILPRICE.UNIT("BRENT_CRUDE_USD")` returns currency/unit.
- `=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")` returns a table for an allowlisted GET endpoint.
- `=OILPRICE.CODES()` returns codes available to the supplied API key.

An OilPriceAPI account and API key are required. Dataset access, endpoint access, quotas, and limits depend on the account. The add-in does not infer plan names or limits.

`PRICE` intentionally returns a bare number for spreadsheet calculations. Use `INFO`, `STATUS`, or `UNIT` when the source context matters.

## Distribution Status

- Mac Excel 16.110.2 on macOS passed the sideload, authentication, formula, recalculation, and secret-free diagnostics smoke on 2026-07-03.
- Windows Excel and Excel on the web remain unclaimed until their clean runtime smoke is recorded.
- AppSource submission remains pending. See [APPSOURCE_METADATA.md](APPSOURCE_METADATA.md).
- [CUSTOMER_QUICKSTART.md](CUSTOMER_QUICKSTART.md) documents the currently proven Mac preview path.

## Development

```bash
npm ci
npm run scan:secrets
npm run validate:claims
npm test -- --runInBand
npm run build
npx office-addin-manifest validate manifest.xml
```

## Runtime Design

- `manifest.xml` wires a long-lived shared runtime.
- `src/functions/functions.ts` implements the custom functions and an explicit endpoint allowlist.
- `src/taskpane/taskpane.ts` stores the API key in `OfficeRuntime.storage`, tests the key, and emits diagnostics without the key or formula arguments.
- Requests fail closed for missing/invalid keys, entitlement and quota errors, rate limits, timeouts, malformed responses, no data, and network/CORS failures.

Internal validation and distribution procedures are in [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md), [DISTRIBUTION.md](DISTRIBUTION.md), and [EXCEL_SUPPORT_RUNBOOK.md](EXCEL_SUPPORT_RUNBOOK.md).
