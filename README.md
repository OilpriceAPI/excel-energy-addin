# OilPriceAPI Excel Starter Workbook

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)
[![GitHub](https://img.shields.io/github/stars/OilpriceAPI/excel-energy-addin?style=social)](https://github.com/OilpriceAPI/excel-energy-addin)

Open a workbook, paste an OilPriceAPI key, and get a narrow latest-price starter table without manifest XML, macros, or add-in sideloading.

## Overview

The repo still contains the Office add-in code, but the customer-first path is now the generated starter workbook:

- `Energy_Price_Comparison_Template.xlsx`
- `Start Here`, `Settings`, `Latest Prices`, and `Examples` sheets
- API key input in `Settings!B2`
- native Excel `WEBSERVICE()` and `FILTERXML()` formulas against `/v1/prices/excel-latest.xml`
- WTI and Brent starter rows

## Features

✅ **No XML first-use path** - No manifest sideloading, XML Expansion Packs, Trust Center catalog, VBA, or macros for the starter workbook
✅ **Blank-key distribution** - The workbook ships without embedded API keys or customer data
✅ **Visible worksheet errors** - Missing key, auth, quota/rate-limit, and no-data states are surfaced in cells
✅ **Small supported slice** - WTI and Brent latest-price rows first
⏳ **Broader sheets** - Natural gas, diesel, fuel surcharge, and add-in flows should be added only after endpoint and workbook UX verification

## Installation

### Prerequisites

- Microsoft Excel (2016 or later)
- OilPriceAPI key ([sign up at oilpriceapi.com/signup](https://www.oilpriceapi.com/signup?utm_source=excel&utm_medium=starter_workbook&utm_campaign=readme))

## Starter Workbook

This repo includes `Energy_Price_Comparison_Template.xlsx`, a generated no-key workbook for the website self-service flow.

Regenerate and validate it with:

```bash
npm run generate:starter-workbook
npm run validate:starter-workbook
```

The current artifact is a valid `.xlsx` workbook with `Start Here`, `Settings`, `Latest Prices`, and `Examples` tabs. It uses native formula refresh through `/v1/prices/excel-latest.xml`; see [STARTER_WORKBOOK.md](STARTER_WORKBOOK.md) for validation and support notes.

### Use the workbook

1. Download `Energy_Price_Comparison_Template.xlsx`.
2. Open it in Excel.
3. Paste your OilPriceAPI key into `Settings!B2`.
4. Go to `Latest Prices`.
5. If values do not populate immediately, use `Formulas > Calculate Now` or `Data > Refresh All`.

### Developer add-in path

The Office add-in manifest remains available for development and testing. It is not the first-use path for non-technical customers.

## Usage

### 1. Configure API Key

1. Open the Energy Price Comparison panel
2. Enter your OilPriceAPI key in Settings
3. Click "Save"
4. Click "Test Connection" to verify

### 2. Fetch Prices

1. Select commodities to fetch (Brent, WTI, Natural Gas, Coal)
2. Click "Fetch Prices"
3. A "Data" sheet will be created with raw prices

### 3. Convert to MBtu

1. Click "Convert to MBtu"
2. A "Process" sheet will be created with converted prices
3. Compare prices directly in $/MBtu

## Energy Unit Conversions

The add-in uses standard heat content factors:

| Commodity             | Unit   | Heat Content (MMBtu) |
| --------------------- | ------ | -------------------- |
| Crude Oil (Brent/WTI) | barrel | 5.8                  |
| Natural Gas           | Mcf    | 1.037                |
| Coal (Bituminous)     | tonne  | 24                   |
| Coal (Sub-bituminous) | tonne  | 17                   |
| LNG                   | tonne  | 51.6                 |
| Diesel/Gasoil         | barrel | 5.77                 |
| Gasoline              | barrel | 5.05                 |

**Formula:** `Price per MBtu = Price per unit ÷ Heat content`

### Example

- Brent Crude: $85.50/barrel
- Heat Content: 5.8 MMBtu/barrel
- **Result: $14.74/MBtu**

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
