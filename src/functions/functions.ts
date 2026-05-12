/**
 * OilPrice Excel custom functions MVP.
 *
 * Supported public surface for #12:
 * - =OILPRICE.PRICE("BRENT_CRUDE_USD")
 * - =OILPRICE.PRICE(A2)
 * - =OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")
 */

/// <reference types="@types/office-js" />

declare const OfficeRuntime: {
  storage: {
    getItem(key: string): Promise<string | null>;
  };
};

declare const CustomFunctions: {
  associate(id: string, func: Function): void;
};

const API_ORIGIN = "https://api.oilpriceapi.com";
const API_KEY_STORAGE = "oilpriceapi_key";
const SUPPORTED_GET_PATHS = new Set([
  "/v1/prices/latest",
  "/v1/commodities",
]);

type ResponseError = {
  code: string;
  message: string;
};

function cellError(code: string, message: string): string {
  return `#${code}: ${message}`;
}

function tableError(code: string, message: string): string[][] {
  return [[`#${code}`, message]];
}

async function getApiKey(): Promise<string | null> {
  try {
    const apiKey = await OfficeRuntime.storage.getItem(API_KEY_STORAGE);
    return apiKey && apiKey.trim() ? apiKey.trim() : null;
  } catch {
    return null;
  }
}

function parseResponseError(response: Response): ResponseError {
  if (response.status === 401) {
    return { code: "AUTH_INVALID", message: "API key invalid or expired" };
  }

  if (response.status === 403) {
    return {
      code: "UPGRADE_REQUIRED",
      message: "Plan does not include this endpoint",
    };
  }

  if (response.status === 404) {
    return { code: "NO_DATA", message: "No data returned" };
  }

  if (response.status === 429) {
    return { code: "RATE_LIMITED", message: "Limit reached. Try later" };
  }

  if (response.status >= 500) {
    return { code: "SERVER_ERROR", message: "API temporarily unavailable" };
  }

  return { code: "ERROR", message: `HTTP ${response.status}` };
}

function normalizePath(path: string): string {
  const trimmed = (path || "").trim();
  if (!trimmed.startsWith("/v1/")) {
    throw new Error("UNSUPPORTED_ENDPOINT");
  }
  return trimmed;
}

function buildUrl(path: string, query?: string): string {
  const normalizedPath = normalizePath(path);
  if (!SUPPORTED_GET_PATHS.has(normalizedPath)) {
    throw new Error("UNSUPPORTED_ENDPOINT");
  }

  const cleanedQuery = (query || "").trim().replace(/^\?/, "");
  return `${API_ORIGIN}${normalizedPath}${cleanedQuery ? `?${cleanedQuery}` : ""}`;
}

async function apiGet(path: string, query: string | undefined, apiKey: string): Promise<any> {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      "X-Excel-Addin-Version": "1.0.0",
    },
  });

  if (!response.ok) {
    throw parseResponseError(response);
  }

  return response.json();
}

function isResponseError(error: unknown): error is ResponseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function valueToCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function objectToTable(value: Record<string, unknown>): string[][] {
  const rows = Object.entries(value).map(([key, entry]) => [
    key,
    String(valueToCell(entry)),
  ]);
  return [["Field", "Value"], ...rows];
}

function responseToTable(payload: any): string[][] {
  const data = payload?.data;

  if (Array.isArray(data)) {
    if (data.length === 0) return tableError("NO_DATA", "No data returned");
    if (typeof data[0] !== "object" || data[0] === null) {
      return [["Value"], ...data.map((entry) => [String(valueToCell(entry))])];
    }

    const headers = Object.keys(data[0]);
    const rows = data.map((entry) =>
      headers.map((header) => String(valueToCell(entry[header]))),
    );
    return [headers, ...rows];
  }

  if (data && typeof data === "object") {
    if (Array.isArray(data.commodities)) {
      const commodities = data.commodities;
      if (commodities.length === 0) return tableError("NO_DATA", "No data returned");
      return [
        ["Code", "Name", "Category"],
        ...commodities.map((commodity: any) => [
          String(commodity.code || ""),
          String(commodity.name || commodity.code || ""),
          String(commodity.category || ""),
        ]),
      ];
    }

    return objectToTable(data);
  }

  return tableError("NO_DATA", "No data returned");
}

/**
 * Gets the latest price for a commodity code.
 * @customfunction OILPRICE.PRICE
 * @param code Commodity code, for example BRENT_CRUDE_USD.
 * @returns Latest price as a number, or a worksheet-readable error string.
 */
export async function oilpricePrice(code: string): Promise<number | string> {
  const normalizedCode = (code || "").trim().toUpperCase();
  if (!normalizedCode) {
    return cellError("INVALID_CODE", "Enter a commodity code");
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return cellError("AUTH_REQUIRED", "Set API key in OilPrice pane");
  }

  try {
    const payload = await apiGet(
      "/v1/prices/latest",
      `by_code=${encodeURIComponent(normalizedCode)}`,
      apiKey,
    );
    const price = payload?.data?.price;
    if (typeof price !== "number") {
      return cellError("NO_DATA", "No data returned");
    }
    return price;
  } catch (error) {
    if (isResponseError(error)) {
      return cellError(error.code, error.message);
    }
    return cellError("NETWORK_ERROR", "Cannot reach API");
  }
}

/**
 * Calls a supported OilPriceAPI GET endpoint and spills a compact table.
 * @customfunction OILPRICE.GET
 * @param path Supported API path, for example /v1/prices/latest.
 * @param query Query string, for example by_code=BRENT_CRUDE_USD.
 * @returns A two-dimensional table.
 */
export async function oilpriceGet(
  path: string,
  query?: string,
): Promise<string[][]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return tableError("AUTH_REQUIRED", "Set API key in OilPrice pane");
  }

  try {
    const payload = await apiGet(path, query, apiKey);
    return responseToTable(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "UNSUPPORTED_ENDPOINT") {
      return tableError(
        "UNSUPPORTED_ENDPOINT",
        "Use supported OilPriceAPI GET endpoints only",
      );
    }
    if (isResponseError(error)) {
      return tableError(error.code, error.message);
    }
    return tableError("NETWORK_ERROR", "Cannot reach API");
  }
}

/**
 * Returns supported commodity codes when the endpoint is available.
 * @customfunction OILPRICE.CODES
 * @returns Commodity code table.
 */
export async function oilpriceCodes(): Promise<string[][]> {
  return oilpriceGet("/v1/commodities");
}

export function registerOilpriceFunctions(): void {
  CustomFunctions.associate("PRICE", oilpricePrice);
  CustomFunctions.associate("GET", oilpriceGet);
  CustomFunctions.associate("CODES", oilpriceCodes);
}

registerOilpriceFunctions();
