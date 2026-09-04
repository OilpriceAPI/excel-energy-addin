# OilPrice Excel Add-in

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)

This repository contains the preview OilPrice Excel add-in for refreshable OilPriceAPI formulas. It is not yet listed in Microsoft AppSource.

Product facts are governed by the [versioned OilPriceAPI contract](https://api.oilpriceapi.com/product-facts.json). Latest available values include source timestamps; cadence varies by source, market hours, dataset, and account entitlement.

## Formula Contract

- `=OILPRICE.PRICE("BRENT_CRUDE_USD")` returns the numeric price from the latest available API record.
- `=OILPRICE.INFO("BRENT_CRUDE_USD")` returns price, currency, unit, source, source description, source timestamp, and freshness fields.
- `=OILPRICE.STATUS("BRENT_CRUDE_USD")` returns the API freshness state.
- `=OILPRICE.UNIT("BRENT_CRUDE_USD")` returns currency/unit.
- `=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")` returns a table for an allowlisted GET endpoint.
- `=OILPRICE.CODES()` returns codes available to the supplied API key.

An OilPriceAPI account and API key are required. Dataset access, endpoint access, quotas, and limits depend on the account. The add-in does not infer plan names or limits.

`PRICE` intentionally returns a bare number for spreadsheet calculations. Use `INFO`, `STATUS`, or `UNIT` when the source context matters.

## Supported endpoint families

`OILPRICE.GET` uses an explicit read-only allowlist. In addition to spot and
futures prices, it supports these production endpoint families:

| Family | Example |
| --- | --- |
| EIA WPSR inventories | `=OILPRICE.GET("/v1/ei/oil_inventories/latest")` |
| OPEC production | `=OILPRICE.GET("/v1/ei/opec_productions/latest")` |
| Rig counts | `=OILPRICE.GET("/v1/rig-counts/latest")` |
| Storage | `=OILPRICE.GET("/v1/storage/cushing")` |
| Marine bunker fuels | `=OILPRICE.GET("/v1/bunker-fuels/all")` |
| Well production | `=OILPRICE.GET("/v1/well-production/summary")` |
| Well permits | `=OILPRICE.GET("/v1/ei/well-permits/preview")` |
| Drilling intelligence | `=OILPRICE.GET("/v1/drilling-intelligence/summary")` |
| Account analytics | `=OILPRICE.GET("/v1/analytics/statistics", "code=BRENT_CRUDE_USD&period=30d")` |

Nested records spill into dot-named columns such as `operator.name` and
`freshness.status`; nested summaries spill into dot-named field rows. This
keeps worksheet cells numeric and avoids JSON blobs. Multi-code latest-price
responses append a visible `MISSING CODES` row when the API omits a requested
code. A null latest price returns `#NO_DATA` rather than a misleading zero or a
malformed-response label.

Endpoint access and returned data remain account-dependent. `GET` rejects
paths outside the allowlist and rejects credentials in query strings.

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

These audit, source-claim, secret, build, unit-test, and manifest gates also run
every Monday in GitHub Actions so newly disclosed dependency issues are found
when the repository is otherwise quiet. This package has no production npm
dependencies: its dependency graph is development/build tooling, and the
deployed add-in is the generated static browser bundle.

## Runtime Design

- `manifest.xml` wires a long-lived shared runtime.
- `src/functions/functions.ts` implements the custom functions and an explicit endpoint allowlist.
- `src/taskpane/taskpane.ts` stores the API key in `OfficeRuntime.storage`, tests the key, and emits diagnostics without the key or formula arguments.
- Requests fail closed for missing/invalid keys, entitlement and quota errors, rate limits, timeouts, malformed responses, no data, and network/CORS failures.

Internal validation and distribution procedures are in [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md), [DISTRIBUTION.md](DISTRIBUTION.md), and [EXCEL_SUPPORT_RUNBOOK.md](EXCEL_SUPPORT_RUNBOOK.md).
