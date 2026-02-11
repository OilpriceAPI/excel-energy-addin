/**
 * OilPriceAPI Custom Functions for Excel
 * These functions can be used directly in Excel cells
 */

/// <reference types="@types/office-js" />

// Type declarations for runtime globals
declare const OfficeRuntime: {
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };
};

declare const CustomFunctions: {
  associate(id: string, func: Function): void;
  StreamingInvocation: any;
};

const API_BASE = "https://api.oilpriceapi.com/v1";

/**
 * Helper function to get API key from shared storage
 */
async function getApiKey(): Promise<string | null> {
  try {
    return await OfficeRuntime.storage.getItem("oilpriceapi_key");
  } catch {
    return null;
  }
}

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(endpoint: string, apiKey: string): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });
}

/**
 * Gets the latest price for a commodity
 * @customfunction OILPRICE.LATEST
 * @param code Commodity code (e.g., "BRENT_CRUDE_USD")
 * @param invocation Custom function invocation handler
 * @streaming
 * @cancelable
 */
export function oilpriceLatest(code: string, invocation: any): void {
  let intervalId: any | null = null;

  async function fetchAndSet() {
    const apiKey = await getApiKey();
    if (!apiKey) {
      invocation.setResult("#NO_API_KEY" as any);
      return;
    }

    try {
      const response = await apiRequest(
        `/prices/latest?by_code=${code}`,
        apiKey,
      );

      if (!response.ok) {
        if (response.status === 404) {
          invocation.setResult("#INVALID_CODE" as any);
        } else {
          invocation.setResult("#ERROR" as any);
        }
        return;
      }

      const data = await response.json();
      invocation.setResult(data.data.price);
    } catch (error) {
      invocation.setResult("#ERROR" as any);
    }
  }

  // Initial fetch
  fetchAndSet();

  // Set up 5-minute refresh interval
  intervalId = setInterval(fetchAndSet, 300000);

  // Cleanup on cancel
  invocation.onCanceled = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Gets the latest price for a commodity (alias for OILPRICE.LATEST)
 * @customfunction OILPRICE
 * @param code Commodity code (e.g., "BRENT_CRUDE_USD")
 * @param invocation Custom function invocation handler
 * @streaming
 * @cancelable
 */
export function oilprice(code: string, invocation: any): void {
  return oilpriceLatest(code, invocation);
}

/**
 * Gets historical price data for a commodity
 * @customfunction OILPRICE.HISTORY
 * @param code Commodity code (e.g., "WTI_USD")
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns 2D array with headers and price data
 */
export async function oilpriceHistory(
  code: string,
  startDate: string,
  endDate: string,
): Promise<string[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return [["Error"], ["#NO_API_KEY"]];
  }

  try {
    const response = await apiRequest(
      `/prices/past_year?by_code=${code}`,
      apiKey,
    );

    if (!response.ok) {
      if (response.status === 400) {
        return [["Error"], ["#INVALID_DATE_RANGE"]];
      }
      return [["Error"], ["#ERROR"]];
    }

    const data = await response.json();
    const prices = data.data.prices || [];

    if (prices.length === 0) {
      return [["Error"], ["#NO_DATA"]];
    }

    // Filter by date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = prices.filter((p: any) => {
      const d = new Date(p.date);
      return d >= start && d <= end;
    });

    // Format as 2D array with headers
    const result: string[][] = [["Date", "Price"]];
    filtered.forEach((p: any) => {
      result.push([p.date, p.price.toFixed(2)]);
    });

    return result;
  } catch (error) {
    return [["Error"], ["#ERROR"]];
  }
}

/**
 * Converts a commodity price between different units
 * @customfunction OILPRICE.CONVERT
 * @param code Commodity code (e.g., "BRENT_CRUDE_USD")
 * @param fromUnit Source unit (e.g., "barrel", "gallon")
 * @param toUnit Target unit (e.g., "MBtu", "liter")
 * @returns Converted price
 */
export async function oilpriceConvert(
  code: string,
  fromUnit: string,
  toUnit: string,
): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest(`/prices/latest?by_code=${code}`, apiKey);

    if (!response.ok) {
      return "#INVALID_CODE";
    }

    const data = await response.json();
    const price = data.data.price;

    // Use conversion utilities
    const { convertToMBtu, getHeatContent, convertFromMBtu } =
      await import("../utils/conversions");

    try {
      // Simplified conversion - assumes heat content of 5.8 MMBtu/barrel for oil
      const heatContent = 5.8;

      if (toUnit.toLowerCase() === "mbtu") {
        return convertToMBtu(price, fromUnit as any, heatContent);
      } else if (fromUnit.toLowerCase() === "mbtu") {
        return convertFromMBtu(price, toUnit as any, heatContent);
      } else {
        // Convert through MBtu as intermediate
        const inMBtu = convertToMBtu(price, fromUnit as any, heatContent);
        return convertFromMBtu(inMBtu, toUnit as any, heatContent);
      }
    } catch (error) {
      return "#CONVERSION_ERROR";
    }
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the average price for a commodity over specified days
 * @customfunction OILPRICE_AVG
 * @param code Commodity code (e.g., "BRENT_CRUDE_USD")
 * @param days Number of days to average (e.g., 30)
 * @returns Average price
 */
export async function oilpriceAvg(
  code: string,
  days: number,
): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest(
      `/prices/past_month?by_code=${code}`,
      apiKey,
    );

    if (!response.ok) {
      return "#INVALID_CODE";
    }

    const data = await response.json();
    const prices = data.data.prices || [];

    if (prices.length === 0) {
      return "#NO_DATA_ERROR";
    }

    // Take last N days
    const recentPrices = prices.slice(-days);
    const sum = recentPrices.reduce((acc: number, p: any) => acc + p.price, 0);
    return sum / recentPrices.length;
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the minimum price across all commodities or for a specific commodity
 * @customfunction OILPRICE_MIN
 * @param code Optional commodity code
 * @returns Minimum price
 */
export async function oilpriceMin(code?: string): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    if (code) {
      // Get min for specific commodity from history
      const response = await apiRequest(
        `/prices/past_month?by_code=${code}`,
        apiKey,
      );

      if (!response.ok) {
        return "#INVALID_CODE";
      }

      const data = await response.json();
      const prices = data.data.prices || [];

      if (prices.length === 0) {
        return "#NO_DATA_ERROR";
      }

      return Math.min(...prices.map((p: any) => p.price));
    } else {
      // Get min across all commodities
      const response = await apiRequest("/prices/all", apiKey);

      if (!response.ok) {
        return "#ERROR";
      }

      const data = await response.json();
      const allPrices = data.data || [];

      if (allPrices.length === 0) {
        return "#NO_DATA_ERROR";
      }

      return Math.min(...allPrices.map((p: any) => p.price));
    }
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the maximum price across all commodities or for a specific commodity
 * @customfunction OILPRICE_MAX
 * @param code Optional commodity code
 * @returns Maximum price
 */
export async function oilpriceMax(code?: string): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    if (code) {
      // Get max for specific commodity from history
      const response = await apiRequest(
        `/prices/past_month?by_code=${code}`,
        apiKey,
      );

      if (!response.ok) {
        return "#INVALID_CODE";
      }

      const data = await response.json();
      const prices = data.data.prices || [];

      if (prices.length === 0) {
        return "#NO_DATA_ERROR";
      }

      return Math.max(...prices.map((p: any) => p.price));
    } else {
      // Get max across all commodities
      const response = await apiRequest("/prices/all", apiKey);

      if (!response.ok) {
        return "#ERROR";
      }

      const data = await response.json();
      const allPrices = data.data || [];

      if (allPrices.length === 0) {
        return "#NO_DATA_ERROR";
      }

      return Math.max(...allPrices.map((p: any) => p.price));
    }
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the latest diesel price for a US state
 * @customfunction DIESEL_PRICE
 * @param state Two-letter state code (e.g., "CA", "TX")
 * @param invocation Custom function invocation handler
 * @streaming
 * @cancelable
 */
export function dieselPrice(state: string, invocation: any): void {
  let intervalId: any | null = null;

  async function fetchAndSet() {
    const apiKey = await getApiKey();
    if (!apiKey) {
      invocation.setResult("#NO_API_KEY" as any);
      return;
    }

    try {
      const response = await apiRequest(
        `/diesel-prices/states/${state}`,
        apiKey,
      );

      if (!response.ok) {
        if (response.status === 404) {
          invocation.setResult("#INVALID_STATE" as any);
        } else {
          invocation.setResult("#ERROR" as any);
        }
        return;
      }

      const data = await response.json();
      invocation.setResult(data.data.price);
    } catch (error) {
      invocation.setResult("#ERROR" as any);
    }
  }

  // Initial fetch
  fetchAndSet();

  // Set up 60-minute refresh interval for diesel prices
  intervalId = setInterval(fetchAndSet, 3600000);

  // Cleanup on cancel
  invocation.onCanceled = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Returns all available commodity codes from the API
 * @customfunction OILPRICE.CODES
 * @returns 2D array with [Code, Name, Category] for all commodities
 */
export async function oilpriceCodes(): Promise<string[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return [["Error"], ["#NO_API_KEY"]];
  }

  try {
    const response = await apiRequest("/commodities", apiKey);

    if (!response.ok) {
      return [["Error"], ["#ERROR"]];
    }

    const data = await response.json();
    const commodities = data.data?.commodities || data.data || [];

    if (commodities.length === 0) {
      return [["Error"], ["#NO_DATA"]];
    }

    const result: string[][] = [["Code", "Name", "Category"]];
    commodities.forEach((c: any) => {
      result.push([
        c.code,
        c.name || c.code.replace(/_/g, " "),
        c.category || "",
      ]);
    });

    return result;
  } catch (error) {
    return [["Error"], ["#ERROR"]];
  }
}

/**
 * Gets the latest futures price for a contract
 * @customfunction FUTURES_PRICE
 * @param contract Futures contract code (e.g., "ice-brent", "ice-wti", "natural-gas")
 * @returns Latest futures price
 */
export async function futuresPrice(contract: string): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest(`/futures/${contract}`, apiKey);

    if (!response.ok) {
      if (response.status === 404) {
        return "#INVALID_CONTRACT";
      }
      return "#ERROR";
    }

    const data = await response.json();
    return data.data.price;
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the futures curve for a contract
 * @customfunction FUTURES_CURVE
 * @param contract Futures contract code (e.g., "ice-brent", "ice-wti", "natural-gas")
 * @returns 2D array with futures curve data
 */
export async function futuresCurve(contract: string): Promise<string[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return [["Error"], ["#NO_API_KEY"]];
  }

  try {
    const response = await apiRequest(`/futures/${contract}/curve`, apiKey);

    if (!response.ok) {
      if (response.status === 404) {
        return [["Error"], ["#INVALID_CONTRACT"]];
      }
      return [["Error"], ["#ERROR"]];
    }

    const data = await response.json();
    const curve = data.data.curve || [];

    if (curve.length === 0) {
      return [["Error"], ["#NO_DATA"]];
    }

    const result: string[][] = [["Month", "Price"]];
    curve.forEach((point: any) => {
      result.push([point.month, point.price.toFixed(2)]);
    });

    return result;
  } catch (error) {
    return [["Error"], ["#ERROR"]];
  }
}

/**
 * Gets the latest Cushing storage level
 * @customfunction STORAGE_CUSHING
 * @returns Cushing inventory level in million barrels
 */
export async function storageCushing(): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest("/storage/cushing", apiKey);

    if (!response.ok) {
      return "#ERROR";
    }

    const data = await response.json();
    return data.data.inventory;
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the latest Strategic Petroleum Reserve level
 * @customfunction STORAGE_SPR
 * @returns SPR inventory level in million barrels
 */
export async function storageSpr(): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest("/storage/spr", apiKey);

    if (!response.ok) {
      return "#ERROR";
    }

    const data = await response.json();
    return data.data.inventory;
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets the latest rig count by type
 * @customfunction RIG_COUNT
 * @param type Rig type (e.g., "oil", "gas", "total")
 * @returns Rig count
 */
export async function rigCount(type: string): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest("/rig-counts/latest", apiKey);

    if (!response.ok) {
      return "#ERROR";
    }

    const data = await response.json();
    const typeLower = type.toLowerCase();

    if (typeLower === "oil") {
      return data.data.oil;
    } else if (typeLower === "gas") {
      return data.data.gas;
    } else if (typeLower === "total") {
      return data.data.total;
    } else {
      return "#INVALID_TYPE";
    }
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets monthly forecast price for a commodity
 * @customfunction FORECAST_PRICE
 * @param commodity Commodity code (e.g., "WTI_USD", "BRENT_CRUDE_USD")
 * @param period Forecast period (e.g., "2026-03")
 * @returns Forecast price
 */
export async function forecastPrice(
  commodity: string,
  period: string,
): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest(
      `/forecasts/monthly/${period}?commodity=${commodity}`,
      apiKey,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return "#INVALID_PERIOD";
      }
      return "#ERROR";
    }

    const data = await response.json();
    return data.data.price;
  } catch (error) {
    return "#ERROR";
  }
}

/**
 * Gets statistical analytics for a commodity
 * @customfunction OILPRICE_STATS
 * @param code Commodity code (e.g., "BRENT_CRUDE_USD")
 * @param days Number of days for analysis (e.g., 30)
 * @returns 2D array with statistical metrics
 */
export async function oilpriceStats(
  code: string,
  days: number,
): Promise<string[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return [["Error"], ["#NO_API_KEY"]];
  }

  try {
    const response = await apiRequest(
      `/analytics/statistics?commodity=${code}&days=${days}`,
      apiKey,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [["Error"], ["#INVALID_CODE"]];
      }
      return [["Error"], ["#ERROR"]];
    }

    const data = await response.json();
    const stats = data.data;

    const result: string[][] = [["Metric", "Value"]];
    result.push(["Mean", stats.mean.toFixed(2)]);
    result.push(["Median", stats.median.toFixed(2)]);
    result.push(["StdDev", stats.std_dev.toFixed(2)]);
    result.push(["Min", stats.min.toFixed(2)]);
    result.push(["Max", stats.max.toFixed(2)]);

    return result;
  } catch (error) {
    return [["Error"], ["#ERROR"]];
  }
}

/**
 * Gets the price spread between two commodities
 * @customfunction OILPRICE_SPREAD
 * @param code1 First commodity code (e.g., "BRENT_CRUDE_USD")
 * @param code2 Second commodity code (e.g., "WTI_USD")
 * @returns Spread value (code1 - code2)
 */
export async function oilpriceSpread(
  code1: string,
  code2: string,
): Promise<number | string> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return "#NO_API_KEY";
  }

  try {
    const response = await apiRequest(
      `/analytics/spread?commodity1=${code1}&commodity2=${code2}`,
      apiKey,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return "#INVALID_CODE";
      }
      return "#ERROR";
    }

    const data = await response.json();
    return data.data.spread;
  } catch (error) {
    return "#ERROR";
  }
}

// Register functions with CustomFunctions runtime
CustomFunctions.associate("OILPRICE.LATEST", oilpriceLatest);
CustomFunctions.associate("OILPRICE", oilprice);
CustomFunctions.associate("OILPRICE.HISTORY", oilpriceHistory);
CustomFunctions.associate("OILPRICE.CONVERT", oilpriceConvert);
CustomFunctions.associate("OILPRICE_AVG", oilpriceAvg);
CustomFunctions.associate("OILPRICE_MIN", oilpriceMin);
CustomFunctions.associate("OILPRICE_MAX", oilpriceMax);
CustomFunctions.associate("DIESEL_PRICE", dieselPrice);
CustomFunctions.associate("OILPRICE.CODES", oilpriceCodes);
CustomFunctions.associate("FUTURES_PRICE", futuresPrice);
CustomFunctions.associate("FUTURES_CURVE", futuresCurve);
CustomFunctions.associate("STORAGE_CUSHING", storageCushing);
CustomFunctions.associate("STORAGE_SPR", storageSpr);
CustomFunctions.associate("RIG_COUNT", rigCount);
CustomFunctions.associate("FORECAST_PRICE", forecastPrice);
CustomFunctions.associate("OILPRICE_STATS", oilpriceStats);
CustomFunctions.associate("OILPRICE_SPREAD", oilpriceSpread);
