# OilPriceAPI Excel Starter Workbook

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)
[![GitHub](https://img.shields.io/github/stars/OilpriceAPI/excel-energy-addin?style=social)](https://github.com/OilpriceAPI/excel-energy-addin)

Download the starter workbook, paste an OilPriceAPI key into the visible key cell, and edit the endpoint path/query cells to look up supported GET data endpoints from Excel.

## Overview

The repo still contains the Office add-in code, but the customer-first workbook artifact is now the generated API runner:

- `Energy_Price_Comparison_Template.xlsx`
- one visible `API Runner` sheet
- API key input in the selected `API Runner!B5` cell
- editable endpoint path in `API Runner!B6`
- editable query string in `API Runner!B7`
- native Excel `WEBSERVICE()` and `FILTERXML()` formulas against `/v1/excel/run.xml`
- a normalized results table for the selected endpoint

## Features

- **One-page first-use path** - the key cell is selected when the workbook opens
- **No macro starter artifact** - the workbook ships without embedded keys, VBA, or macros
- **Blank-key distribution** - the workbook ships without embedded API keys or customer data
- **Visible worksheet errors** - missing key, auth, quota/rate-limit, and no-data states are surfaced in cells
- **Editable endpoint runner** - change the path/query cells to use supported GET endpoints available to the pasted key
- **Starter examples** - WTI, Brent, price history, and futures curve examples are included as copyable path/query pairs

## Installation

### Prerequisites

- Windows desktop Excel 2016 or later for this no-add-in formula workbook. It uses `WEBSERVICE()` and `FILTERXML()`, which are not the recommended path for Excel for Mac or Excel for the web.
- For Mac or Excel for the web, use the browser export at [oilpriceapi.com/excel](https://www.oilpriceapi.com/excel) until a Power Query or add-in path is verified.
- OilPriceAPI key ([sign up at oilpriceapi.com/signup](https://www.oilpriceapi.com/signup?utm_source=excel&utm_medium=starter_workbook&utm_campaign=readme))

## Starter Workbook

This repo includes `Energy_Price_Comparison_Template.xlsx`, a generated no-key workbook for the website self-service flow.

Regenerate and validate it with:

```bash
npm run generate:starter-workbook
npm run validate:starter-workbook
```

The current artifact is a valid `.xlsx` workbook with one visible `API Runner` sheet. It uses native formula refresh through `/v1/excel/run.xml`; see [STARTER_WORKBOOK.md](STARTER_WORKBOOK.md) for validation and support notes.

### Use the workbook

1. Download `Energy_Price_Comparison_Template.xlsx`.
2. Open it in Windows desktop Excel.
3. If Excel asks, choose `Enable Editing` and `Enable Content`. Microsoft controls those prompts for downloaded workbooks that call web endpoints.
4. Paste your OilPriceAPI key into the selected key cell, `API Runner!B5`.
5. Edit `API Runner!B6` for the endpoint path and `API Runner!B7` for query params if you want something other than the WTI starter lookup.
6. Press `Enter`. If values do not populate immediately, use `Formulas > Calculate Now`.

### Developer add-in path

The Office add-in manifest remains available for development and testing. It is not the first-use path for non-technical customers.

## Current Scope

The customer-ready starter workbook scope is a bounded API runner for supported GET data endpoints. The Office add-in code and broader energy-conversion utilities remain in the repository for development, but they are not the support-first path and should not be used as public setup instructions until separately verified.

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Development Mode

```bash
npm run dev  # Watch mode
```

### Test Coverage

Current test coverage: **98.18%**

- Conversion utilities: 100%
- API client: 97%

## Project Structure

```
excel-energy-addin/
├── src/
│   ├── index.ts              # Core Excel operations
│   └── utils/
│       ├── conversions.ts    # Energy unit conversions
│       └── api-client.ts     # OilPriceAPI client
├── tests/
│   └── unit/
│       ├── conversions.test.ts
│       └── api-client.test.ts
├── public/
│   ├── taskpane.html         # UI
│   ├── taskpane.css          # Styles
│   └── taskpane.js           # UI logic
├── dist/                     # Build output
├── manifest.xml              # Excel add-in manifest
└── package.json
```

## Architecture

### Data Flow

1. **Taskpane UI** → User selects commodities
2. **API Client** → Fetches prices from OilPriceAPI
3. **Data Sheet** → Stores raw price data
4. **Conversion Utils** → Calculates $/MBtu
5. **Process Sheet** → Displays converted prices

### Technology Stack

- **TypeScript** - Type-safe development
- **Office.js** - Excel integration
- **Webpack** - Module bundling
- **Jest** - Unit testing
- **OilPriceAPI** - Real-time commodity prices

## Roadmap

See [GitHub Issues](https://github.com/OilpriceAPI/oilpriceapi-api/issues) for full roadmap.

### Phase 1: Core (Current) ✅

- [x] Energy unit conversions
- [x] API client with error handling
- [x] Data and Process sheets
- [x] Basic UI

### Phase 2: Enhanced Units 🚧

- [ ] Multi-unit toggle (MBtu, GJ, kWh, toe)
- [ ] Multi-currency (USD, EUR, GBP)
- [ ] Historical exchange rates

### Phase 3: Visualization 📊

- [ ] Tufte-style dashboard
- [ ] Sparklines
- [ ] Small multiples
- [ ] Relative value matrix

### Phase 4: Advanced Features 🚀

- [ ] Historical data analysis
- [ ] Forward curves
- [ ] Price alerts
- [ ] Scenario modeling

## Support

- **Documentation**: [docs.oilpriceapi.com](https://docs.oilpriceapi.com)
- **Issues**: [GitHub Issues](https://github.com/OilpriceAPI/oilpriceapi-api/issues)
- **Email**: support@oilpriceapi.com

## License

MIT License - Free for personal and commercial use

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure 80%+ test coverage
5. Submit a pull request

## Also Available As

- **[Python SDK](https://pypi.org/project/oilpriceapi/)** - Python client with Pandas integration
- **[Node.js SDK](https://www.npmjs.com/package/oilpriceapi)** - TypeScript/JavaScript SDK
- **[Google Sheets Add-on](https://github.com/OilpriceAPI/google-sheets-addin)** - Custom functions for Google Sheets

## Acknowledgments

Built with care by the OilPriceAPI team

Special thanks to:

- Edward Tufte for design principles
- Microsoft Office.js team
- Open source contributors
