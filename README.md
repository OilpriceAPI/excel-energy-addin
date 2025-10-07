# Excel Energy Price Comparison Add-in

[![Website](https://img.shields.io/badge/Website-oilpriceapi.com-blue)](https://www.oilpriceapi.com)
[![Docs](https://img.shields.io/badge/Docs-docs.oilpriceapi.com-green)](https://docs.oilpriceapi.com)
[![GitHub](https://img.shields.io/github/stars/OilpriceAPI/excel-energy-addin?style=social)](https://github.com/OilpriceAPI/excel-energy-addin)

Compare energy commodity prices across units and currencies using [OilPriceAPI](https://www.oilpriceapi.com).

## Overview

This Excel add-in allows analysts to:
- Fetch real-time energy commodity prices (Brent, WTI, Natural Gas, Coal, etc.)
- Convert prices to equivalent energy units ($/MBtu) for direct comparison
- Analyze price relationships across different commodities
- Export data for further analysis

## Features

✅ **Real-time Price Fetching** - Get latest spot prices from OilPriceAPI
✅ **Energy Unit Conversions** - Convert to $/MBtu using standard heat content factors
✅ **Data Tab** - Clean tabular view of raw commodity prices
✅ **Process Tab** - Converted prices for direct comparison
⏳ **Dashboard Tab** - Tufte-style visualizations (coming soon)
⏳ **Multi-Currency** - USD, EUR, GBP support (coming soon)
⏳ **Historical Data** - Time series analysis (coming soon)

## Installation

### Prerequisites
- Microsoft Excel (2016 or later)
- OilPriceAPI key ([get one free at oilpriceapi.com](https://www.oilpriceapi.com))

### Install from GitHub
1. Download the latest release
2. Open Excel
3. Go to Insert > Get Add-ins > Upload My Add-in
4. Select the `manifest.xml` file
5. The add-in will appear in the Home ribbon

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

| Commodity | Unit | Heat Content (MMBtu) |
|-----------|------|---------------------|
| Crude Oil (Brent/WTI) | barrel | 5.8 |
| Natural Gas | Mcf | 1.037 |
| Coal (Bituminous) | tonne | 24 |
| Coal (Sub-bituminous) | tonne | 17 |
| LNG | tonne | 51.6 |
| Diesel/Gasoil | barrel | 5.77 |
| Gasoline | barrel | 5.05 |

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

## Acknowledgments

Built with ❤️ by the OilPriceAPI team

Special thanks to:
- Edward Tufte for design principles
- Microsoft Office.js team
- Open source contributors
