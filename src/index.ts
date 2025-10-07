/**
 * Excel Energy Comparison Add-in
 * Core Excel workbook operations
 */

import { OilPriceAPIClient, PriceData } from './utils/api-client';
import { convertToMBtu, getHeatContent, CommodityType } from './utils/conversions';

/**
 * Commodity code to commodity type mapping
 */
const COMMODITY_MAP: Record<string, { type: CommodityType; unit: string }> = {
  'BRENT_CRUDE_USD': { type: 'BRENT_CRUDE_OIL', unit: 'barrel' },
  'WTI_USD': { type: 'WTI_CRUDE_OIL', unit: 'barrel' },
  'NATURAL_GAS_USD': { type: 'NATURAL_GAS', unit: 'MBtu' },  // Henry Hub is already in $/MMBtu
  'NATURAL_GAS_GBP': { type: 'NATURAL_GAS', unit: 'therm' },
  'DUTCH_TTF_EUR': { type: 'NATURAL_GAS', unit: 'MWh' },
  'COAL_USD': { type: 'COAL_BITUMINOUS', unit: 'tonne' }
};

/**
 * Create or clear the Data sheet
 */
export async function createDataSheet(prices: PriceData[]): Promise<void> {
  await Excel.run(async (context) => {
    // Get or create Data sheet
    let sheet = context.workbook.worksheets.getItemOrNullObject('Data');
    await context.sync();

    if (sheet.isNullObject) {
      sheet = context.workbook.worksheets.add('Data');
    }

    // Clear existing data
    sheet.getUsedRange()?.clear();

    // Add headers
    const headers = [['Commodity Code', 'Price', 'Currency', 'Unit', 'Timestamp', 'Last Updated']];
    const headerRange = sheet.getRange('A1:F1');
    headerRange.values = headers;
    headerRange.format.font.bold = true;
    headerRange.format.fill.color = '#f0f0f0';

    // Add price data
    const rows = prices.map(p => [
      p.code,
      p.price,
      p.currency || 'USD',
      COMMODITY_MAP[p.code]?.unit || 'unknown',
      p.timestamp,
      new Date().toISOString()
    ]);

    if (rows.length > 0) {
      const dataRange = sheet.getRange(`A2:F${rows.length + 1}`);
      dataRange.values = rows;
    }

    // Format price column as number (not forcing USD since we have GBP)
    const priceRange = sheet.getRange(`B2:B${rows.length + 1}`);
    priceRange.numberFormat = [['#,##0.00']];

    // Auto-fit columns
    sheet.getUsedRange()?.format.autofitColumns();

    await context.sync();
  });
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(apiKey: string): Promise<{gbpUsd: number, eurUsd: number}> {
  try {
    const response = await fetch('https://api.oilpriceapi.com/v1/prices/latest?by_code=GBP_USD,EUR_USD', {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const prices = data.data.prices || [];

      const gbpRate = prices.find((p: any) => p.code === 'GBP_USD')?.price || 1.30;
      const eurRate = prices.find((p: any) => p.code === 'EUR_USD')?.price || 1.10;

      return { gbpUsd: gbpRate, eurUsd: eurRate };
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
  }
  return { gbpUsd: 1.30, eurUsd: 1.10 }; // Fallback rates
}

/**
 * Create Process sheet with MBtu conversions
 */
export async function createProcessSheet(): Promise<void> {
  await Excel.run(async (context) => {
    // Get Data sheet
    const dataSheet = context.workbook.worksheets.getItem('Data');

    // Get or create Process sheet
    let processSheet = context.workbook.worksheets.getItemOrNullObject('Process');
    await context.sync();

    if (processSheet.isNullObject) {
      processSheet = context.workbook.worksheets.add('Process');
    }

    // Clear existing data
    processSheet.getUsedRange()?.clear();

    // Add headers
    const headers = [['Commodity', 'Original Price', 'Currency', 'Unit', 'USD Price', 'Heat Content (MMBtu)', 'Price per MBtu (USD)']];
    const headerRange = processSheet.getRange('A1:G1');
    headerRange.values = headers;
    headerRange.format.font.bold = true;
    headerRange.format.fill.color = '#e3f2fd';

    // Get data from Data sheet
    const dataRange = dataSheet.getUsedRange();
    dataRange.load('values');
    await context.sync();

    const data = dataRange.values;
    const processRows: any[][] = [];

    // Fetch exchange rates for currency conversions
    const apiKey = localStorage.getItem('oilpriceapi_key') || '';
    const rates = await fetchExchangeRates(apiKey);
    console.log('Exchange rates - GBP/USD:', rates.gbpUsd, 'EUR/USD:', rates.eurUsd);

    // Skip header row, process data
    for (let i = 1; i < data.length; i++) {
      const [code, price, currency, unit] = data[i];

      if (!code || !COMMODITY_MAP[code as string]) continue;

      const commodityInfo = COMMODITY_MAP[code as string];
      const heatContent = getHeatContent(commodityInfo.type);

      // Convert price to USD if needed
      let usdPrice = Number(price);
      if (currency === 'GBP' || currency === 'GBp') {
        // UK Natural Gas is in PENCE per therm, not pounds!
        // Convert: pence → pounds → USD
        usdPrice = (Number(price) / 100) * rates.gbpUsd;
      } else if (currency === 'EUR') {
        // Convert EUR → USD
        usdPrice = Number(price) * rates.eurUsd;
      }

      // For US Natural Gas, unit is already MBtu (no conversion needed)
      // For others, convert to $/MMBtu
      let pricePerMBtu;
      if (commodityInfo.unit === 'MBtu') {
        // Already in $/MMBtu
        pricePerMBtu = usdPrice;
      } else {
        pricePerMBtu = convertToMBtu(usdPrice, commodityInfo.unit as any, heatContent);
      }

      processRows.push([
        code,
        Number(price),
        currency || 'USD',
        unit,
        usdPrice,
        heatContent,
        pricePerMBtu
      ]);
    }

    // Write converted data
    if (processRows.length > 0) {
      const processDataRange = processSheet.getRange(`A2:G${processRows.length + 1}`);
      processDataRange.values = processRows;

      // Format columns
      processSheet.getRange(`B2:B${processRows.length + 1}`).numberFormat = [['#,##0.00']];  // Original price
      processSheet.getRange(`E2:E${processRows.length + 1}`).numberFormat = [['$#,##0.00']]; // USD price
      processSheet.getRange(`F2:F${processRows.length + 1}`).numberFormat = [['0.000']];     // Heat content
      processSheet.getRange(`G2:G${processRows.length + 1}`).numberFormat = [['$#,##0.00']]; // Price per MBtu
    }

    // Auto-fit columns
    processSheet.getUsedRange()?.format.autofitColumns();

    // Activate Process sheet
    processSheet.activate();

    await context.sync();
  });
}

/**
 * Test connection to OilPriceAPI
 */
export async function testConnection(apiKey: string): Promise<boolean> {
  try {
    const client = new OilPriceAPIClient(apiKey);
    return await client.testConnection();
  } catch (error) {
    return false;
  }
}

/**
 * Fetch prices from OilPriceAPI
 */
export async function fetchPrices(apiKey: string, codes: string[]): Promise<PriceData[]> {
  const client = new OilPriceAPIClient(apiKey);
  return await client.getMultiplePrices(codes);
}
