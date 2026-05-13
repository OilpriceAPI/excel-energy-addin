# OilPrice Excel Add-in

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)
[![GitHub](https://img.shields.io/github/stars/OilpriceAPI/excel-energy-addin?style=social)](https://github.com/OilpriceAPI/excel-energy-addin)

This repository contains the OilPrice Excel add-in for refreshable OilPriceAPI formulas.

The customer-facing Excel path is the add-in. Other spreadsheet setup variants are not the current support path.

## MVP Scope

- `=OILPRICE.PRICE("BRENT_CRUDE_USD")`
- `=OILPRICE.PRICE(A2)`
- `=OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")`
- `=OILPRICE.CODES()`
- API key manager in the task pane
- Shared key storage for task pane and formulas
- Plain worksheet error strings for auth, quota, tier, no-data, and network failures

Do not send customer instructions until Windows Excel smoke proves install, key save/test, production API log hit, formula recalculation after symbol change, and no `#NAME?`.

See [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md) for the proof checklist that gates customer instructions.

## Current Documentation

- [ADDIN_ACTIVATION_CHECKLIST.md](ADDIN_ACTIVATION_CHECKLIST.md) is the gate for runtime proof.
- [DISTRIBUTION.md](DISTRIBUTION.md) is the internal runbook for managed-customer and public self-serve distribution after runtime proof.
- [INSTALL.md](INSTALL.md) and [QUICK_INSTALL.md](QUICK_INSTALL.md) are internal preview instructions only.
- [docs/legacy](docs/legacy) contains historical planning notes. Do not use those files for customer setup, support replies, AppSource copy, screenshots, or launch status.

## Development

```bash
npm install
npm test -- --runInBand
npm run build
npx office-addin-manifest validate manifest.xml
```

## Project Structure

```
excel-energy-addin/
├── manifest.xml
├── public/
│   ├── functions.html
│   ├── taskpane.html
│   ├── taskpane.css
│   └── taskpane.js
├── src/
│   └── functions/
│       ├── functions.ts
│       └── functions.json
├── tests/
│   └── unit/
│       └── functions.test.ts
├── webpack.config.js
└── webpack.dev.js
```

## Validation Gate

Before customer use:

1. Build and test pass locally.
2. Manifest validation passes.
3. Windows Excel sideload loads the pane and custom formulas.
4. `=OILPRICE.PRICE("BRENT_CRUDE_USD")` returns a number from production.
5. Changing a referenced symbol cell recalculates.
6. Production logs show the expected request for the test key.

## Backlog

The old starter workbook generator is retained only as historical/internal context. It is not the customer onboarding path unless explicitly reprioritized.
