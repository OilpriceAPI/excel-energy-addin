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

type EndpointCatalogEntry = {
  id: string;
  path: string;
  pattern: RegExp;
  description: string;
};

const ENDPOINT_CATALOG: EndpointCatalogEntry[] = [
  {
    id: "status",
    path: "/v1/status",
    pattern: /^\/v1\/status$/,
    description: "API status",
  },
  {
    id: "prices",
    path: "/v1/prices",
    pattern: /^\/v1\/prices$/,
    description: "Price listing",
  },
  {
    id: "prices-latest",
    path: "/v1/prices/latest",
    pattern: /^\/v1\/prices\/latest$/,
    description: "Latest prices",
  },
  {
    id: "prices-past-day",
    path: "/v1/prices/past_day",
    pattern: /^\/v1\/prices\/past_day$/,
    description: "Past day prices",
  },
  {
    id: "prices-past-week",
    path: "/v1/prices/past_week",
    pattern: /^\/v1\/prices\/past_week$/,
    description: "Past week prices",
  },
  {
    id: "prices-past-month",
    path: "/v1/prices/past_month",
    pattern: /^\/v1\/prices\/past_month$/,
    description: "Past month prices",
  },
  {
    id: "prices-past-year",
    path: "/v1/prices/past_year",
    pattern: /^\/v1\/prices\/past_year$/,
    description: "Past year prices",
  },
  {
    id: "prices-historical",
    path: "/v1/prices/historical",
    pattern: /^\/v1\/prices\/historical$/,
    description: "Historical prices",
  },
  {
    id: "prices-all",
    path: "/v1/prices/all",
    pattern: /^\/v1\/prices\/all$/,
    description: "All latest prices",
  },
  {
    id: "prices-all-health",
    path: "/v1/prices/all/health",
    pattern: /^\/v1\/prices\/all\/health$/,
    description: "All-prices health",
  },
  {
    id: "diesel-prices",
    path: "/v1/diesel-prices",
    pattern: /^\/v1\/diesel-prices$/,
    description: "Diesel prices",
  },
  {
    id: "commodities",
    path: "/v1/commodities",
    pattern: /^\/v1\/commodities$/,
    description: "Commodity catalog",
  },
  {
    id: "commodity-categories",
    path: "/v1/commodities/categories",
    pattern: /^\/v1\/commodities\/categories$/,
    description: "Commodity categories",
  },
  {
    id: "commodity-by-code",
    path: "/v1/commodities/{code}",
    pattern: /^\/v1\/commodities\/[A-Za-z0-9_.-]+$/,
    description: "Commodity details by code",
  },
];

const SENSITIVE_QUERY_KEYS = new Set([
  "accesstoken",
  "api_key",
  "apikey",
  "authorization",
  "auth",
  "bearer",
  "bearertoken",
  "client_secret",
  "clientsecret",
  "credential",
  "credentials",
  "key",
  "password",
  "secret",
  "token",
  "access_token",
  "xapikey",
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

  if (response.status === 402) {
    return {
      code: "UPGRADE_REQUIRED",
      message: "Quota or plan limit reached",
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

function findEndpoint(path: string): EndpointCatalogEntry | undefined {
  return ENDPOINT_CATALOG.find((endpoint) => endpoint.pattern.test(path));
}

function normalizeQueryKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[-_.]/g, "");
}

function queryKeyParts(key: string): string[] {
  const parts = [key.split("[", 1)[0]];
  const bracketPattern = /\[([^\]]*)\]/g;
  let match = bracketPattern.exec(key);

  while (match) {
    if (match[1]) parts.push(match[1]);
    match = bracketPattern.exec(key);
  }

  return parts.filter((part) => part.trim());
}

function isSensitiveQueryKey(key: string): boolean {
  return queryKeyParts(key).some((part) =>
    SENSITIVE_QUERY_KEYS.has(normalizeQueryKey(part)),
  );
}

function normalizeQuery(query?: string): string {
  const cleanedQuery = (query || "").trim().replace(/^\?/, "");
  if (!cleanedQuery) return "";

  const params = new URLSearchParams(cleanedQuery);
  let hasSensitiveKey = false;
  params.forEach((_, key) => {
    if (isSensitiveQueryKey(key)) {
      hasSensitiveKey = true;
    }
  });

  if (hasSensitiveKey) {
    throw new Error("UNSUPPORTED_QUERY");
  }

  return cleanedQuery;
}

function buildUrl(path: string, query?: string): string {
  const normalizedPath = normalizePath(path);
  if (!findEndpoint(normalizedPath)) {
    throw new Error("UNSUPPORTED_ENDPOINT");
  }

  const cleanedQuery = normalizeQuery(query);
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

function arrayToTable(data: unknown[]): string[][] {
  if (data.length === 0) return tableError("NO_DATA", "No data returned");
  if (typeof data[0] !== "object" || data[0] === null) {
    return [["Value"], ...data.map((entry) => [String(valueToCell(entry))])];
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((entry: any) =>
    headers.map((header) => String(valueToCell(entry[header]))),
  );
  return [headers, ...rows];
}

function pricesHashToTable(prices: Record<string, unknown>): string[][] {
  const entries = Object.entries(prices);
  if (entries.length === 0) return tableError("NO_DATA", "No data returned");

  const objectEntries = entries.filter(
    ([, value]) =>
      value !== null && typeof value === "object" && !Array.isArray(value),
  ) as Array<[string, Record<string, unknown>]>;

  if (objectEntries.length !== entries.length) {
    return [
      ["Code", "Value"],
      ...entries.map(([code, value]) => [code, String(valueToCell(value))]),
    ];
  }

  const fieldSet = new Set<string>();
  objectEntries.forEach(([, value]) => {
    Object.keys(value).forEach((key) => {
      if (key !== "code") fieldSet.add(key);
    });
  });
  const fields = Array.from(fieldSet);

  return [
    ["Code", ...fields],
    ...objectEntries.map(([code, value]) => [
      code,
      ...fields.map((field) => String(valueToCell(value[field]))),
    ]),
  ];
}

function responseToTable(payload: any): string[][] {
  const data = payload?.data;

  if (Array.isArray(data)) {
    return arrayToTable(data);
  }

  if (data && typeof data === "object") {
    if (Array.isArray(data.prices)) {
      return arrayToTable(data.prices);
    }

    if (
      data.prices &&
      typeof data.prices === "object" &&
      !Array.isArray(data.prices)
    ) {
      return pricesHashToTable(data.prices);
    }

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
    if (error instanceof Error && error.message === "UNSUPPORTED_QUERY") {
      return tableError(
        "UNSUPPORTED_QUERY",
        "Do not pass API keys or credentials in query strings",
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
