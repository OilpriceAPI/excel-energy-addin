/**
 * OilPrice Excel custom functions MVP.
 *
 * Supported public surface for #12:
 * - =OILPRICE.PRICE("BRENT_CRUDE_USD")
 * - =OILPRICE.PRICE(A2)
 * - =OILPRICE.GET("/v1/prices/latest", "by_code=BRENT_CRUDE_USD")
 */

/// <reference types="@types/office-js" />

import {
  OILPRICEAPI_EXCEL_CLIENT,
  OILPRICEAPI_EXCEL_VERSION,
} from "../utils/client-attribution";
import {
  RUNTIME_DIAGNOSTIC_STORAGE_KEY,
  classifyNetworkFailure,
  createRuntimeDiagnostic,
  requestIdFromResponse,
  RuntimeDiagnostic,
} from "../utils/runtime-diagnostics";
import { classifyApiErrorResponse } from "../utils/http-error";

declare const OfficeRuntime: {
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };
};

declare const CustomFunctions: {
  associate(id: string, func: Function): void;
};

const API_ORIGIN = "https://api.oilpriceapi.com";
const API_KEY_STORAGE = "oilpriceapi_key";
const REQUEST_TIMEOUT_MS = 15_000;

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
    id: "rig-counts",
    path: "/v1/rig-counts/{view}",
    pattern:
      /^\/v1\/rig-counts(\/(latest|current|historical|trends|summary))?$/,
    description: "Baker Hughes rig counts",
  },
  {
    id: "storage",
    path: "/v1/storage/{view}",
    pattern:
      /^\/v1\/storage(\/(cushing|spr|regional|history\/[A-Za-z0-9_.-]+))?$/,
    description: "Cushing, SPR, and regional storage",
  },
  {
    id: "ei-oil-inventories",
    path: "/v1/ei/oil_inventories/{view}",
    pattern:
      /^\/v1\/ei\/oil_inventories(\/(latest|summary|by_product|historical|cushing|[A-Za-z0-9_.-]+))?$/,
    description: "EIA WPSR oil inventories",
  },
  {
    id: "ei-opec-production",
    path: "/v1/ei/opec_productions/{view}",
    pattern:
      /^\/v1\/ei\/opec_productions(\/(latest|total|by_country|historical|top_producers|[A-Za-z0-9_.-]+))?$/,
    description: "OPEC production",
  },
  {
    id: "bunker-fuels",
    path: "/v1/bunker-fuels/{view}",
    pattern:
      /^\/v1\/bunker-fuels\/(all|compare|spreads\/ports|ports\/[A-Z]{3,5}|historical\/[A-Z]{3,5})$/,
    description: "Marine bunker fuels and ports",
  },
  {
    id: "well-production",
    path: "/v1/well-production/{view}",
    pattern:
      /^\/v1\/well-production\/(summary|states|states\/[A-Z]{2}|pru\/[A-Za-z0-9_.-]+|wells\/[A-Za-z0-9_.-]+|top-producers|cycle-time|cycle-time\/cohorts)$/,
    description: "Well production",
  },
  {
    id: "ei-well-permits",
    path: "/v1/ei/well-permits/{view}",
    pattern:
      /^\/v1\/ei\/well-permits(\/(preview|states|states\/[A-Z]{2}|latest|summary|by-state|by-operator|by-formation|search|[A-Za-z0-9_.-]+))?$/,
    description: "Well permits",
  },
  {
    id: "drilling-intelligence",
    path: "/v1/drilling-intelligence/{view}",
    pattern:
      /^\/v1\/drilling-intelligence(\/(latest|summary|trends|frac-spreads|well-permits|duc-wells|completions|wells-drilled|basin\/[A-Za-z0-9_.%-]+))?$/,
    description: "Drilling intelligence",
  },
  {
    id: "analytics",
    path: "/v1/analytics/{view}",
    pattern:
      /^\/v1\/analytics\/(performance|statistics|correlation|trend|spread|forecast)$/,
    description: "Account analytics",
  },
  {
    id: "futures",
    path: "/v1/futures/{family}",
    pattern:
      /^\/v1\/futures\/(ice-brent|ice-wti|ice-gasoil|natural-gas|eua-carbon)(\/(historical|ohlc|intraday|spreads|curve|spread-history))?$/,
    description: "Futures curves, OHLC, spreads, and analytics",
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

/**
 * A worksheet cell. Numeric and boolean cells MUST stay unwrapped so Excel
 * treats them as numbers/booleans (right-aligned, chartable, AVERAGE/SUM-safe)
 * rather than text. Mixed matrices are allowed because GET/CODES/INFO declare
 * result.type "any" in functions.json.
 */
type Cell = string | number | boolean;
type Table = Cell[][];

/**
 * Fields whose values are conceptually numeric but which the API sometimes
 * serialises as JSON strings (verified in the captured fixtures — e.g.
 * futures OHLC "open":"84.95" while "last_price":88.1). Values matching these
 * field names are coerced to Number so they chart and aggregate correctly.
 * Only string values are coerced (null/undefined stay blank, never 0), and a
 * value that does not parse to a finite number is left untouched.
 */
const NUMERIC_FIELDS = new Set([
  "open",
  "high",
  "low",
  "close",
  "settlement",
  "settlement_price",
  "last_price",
  "price",
  "spread_value",
  "spread_percentage",
  "front_price",
  "back_price",
  "change_percent",
  "volume",
  "open_interest",
]);

function cellError(code: string, message: string): string {
  return `#${code}: ${message}`;
}

function tableError(code: string, message: string): Table {
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

function browserOnlineState(): boolean | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.onLine;
}

async function persistRuntimeDiagnostic(
  diagnostic: RuntimeDiagnostic,
): Promise<void> {
  try {
    await OfficeRuntime.storage.setItem(
      RUNTIME_DIAGNOSTIC_STORAGE_KEY,
      JSON.stringify(diagnostic),
    );
  } catch {
    // Diagnostics must never break a worksheet function.
  }
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
  return key.trim().toLowerCase().replace(/[-_.]/g, "");
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

async function apiGet(
  path: string,
  query: string | undefined,
  apiKey: string,
): Promise<any> {
  const url = buildUrl(path, query);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const throwTimeout = async (): Promise<never> => {
    const responseError: ResponseError = {
      code: "TIMEOUT",
      message:
        "OilPriceAPI did not respond in time. Retry, then use Test Key after checking service status",
    };
    await persistRuntimeDiagnostic(
      createRuntimeDiagnostic({
        source: "custom-function",
        result: "timeout",
        code: responseError.code,
        endpoint: path,
        durationMs: Date.now() - startedAt,
      }),
    );
    throw responseError;
  };

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          // See taskpane.ts — Office.js locks User-Agent; X-API-Client is how
          // the server classifies this add-in. (#6167)
          "X-API-Client": OILPRICEAPI_EXCEL_CLIENT,
          "X-Excel-Addin-Version": OILPRICEAPI_EXCEL_VERSION,
        },
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        await throwTimeout();
      }
      const failure = classifyNetworkFailure(browserOnlineState());
      await persistRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "custom-function",
          result: failure.result,
          code: failure.code,
          endpoint: path,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw {
        code: failure.code,
        message: `${failure.message}. ${failure.recovery}`,
      } satisfies ResponseError;
    }

    const requestId = requestIdFromResponse(response);

    if (!response.ok) {
      const classified = await classifyApiErrorResponse(response);
      if (controller.signal.aborted) {
        await throwTimeout();
      }
      const responseError: ResponseError = {
        code: classified.code,
        message: classified.message,
      };
      await persistRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "custom-function",
          result: "http-error",
          code: responseError.code,
          endpoint: path,
          durationMs: Date.now() - startedAt,
          httpStatus: response.status,
          requestId,
        }),
      );
      throw responseError;
    }

    try {
      const payload = await response.json();
      await persistRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "custom-function",
          result: "success",
          code: "OK",
          endpoint: path,
          durationMs: Date.now() - startedAt,
          httpStatus: response.status,
          requestId,
        }),
      );
      return payload;
    } catch (error) {
      if (isResponseError(error)) {
        throw error;
      }
      if (controller.signal.aborted) {
        await throwTimeout();
      }
      const responseError: ResponseError = {
        code: "INVALID_RESPONSE",
        message: "API returned an unreadable response",
      };
      await persistRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "custom-function",
          result: "invalid-response",
          code: responseError.code,
          endpoint: path,
          durationMs: Date.now() - startedAt,
          httpStatus: response.status,
          requestId,
        }),
      );
      throw responseError;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function isResponseError(error: unknown): error is ResponseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function valueToCell(value: unknown): Cell {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Flatten nested response context into dot-addressable worksheet fields.
 * Arrays of records are represented by a count here; a primary collection is
 * rendered separately by primaryCollectionToTable.
 */
function flattenRecord(
  value: Record<string, unknown>,
  prefix = "",
  target: Record<string, unknown> = {},
): Record<string, unknown> {
  Object.entries(value).forEach(([key, entry]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (isRecord(entry)) {
      flattenRecord(entry, field, target);
      return;
    }
    if (Array.isArray(entry)) {
      const scalarOnly = entry.every(
        (item) =>
          item === null ||
          ["string", "number", "boolean"].includes(typeof item),
      );
      target[field] = scalarOnly
        ? entry.map((item) => valueToCell(item)).join(", ")
        : entry.length;
      return;
    }
    target[field] = entry;
  });
  return target;
}

/**
 * Renders one worksheet cell for a named field. Numbers and booleans are kept
 * unwrapped so Excel does not coerce them to text. Numeric-looking STRING
 * values (see NUMERIC_FIELDS) are converted to Number so they chart/aggregate.
 */
function cellFor(field: string, value: unknown): Cell {
  if (typeof value === "string" && NUMERIC_FIELDS.has(field)) {
    const trimmed = value.trim();
    if (trimmed !== "") {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return valueToCell(value);
}

function objectToTable(value: Record<string, unknown>): Table {
  const rows: Table = Object.entries(flattenRecord(value)).map(([key, entry]) => [
    key,
    cellFor(key, entry),
  ]);
  return [["Field", "Value"], ...rows];
}

function recordsToTable(records: Array<Record<string, unknown>>): Table {
  if (records.length === 0) return tableError("NO_DATA", "No data returned");

  const headers: string[] = [];
  const seen = new Set<string>();
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });

  return [
    headers,
    ...records.map((record) =>
      headers.map((header) => cellFor(header, record[header])),
    ),
  ];
}

function arrayToTable(data: unknown[]): Table {
  if (data.length === 0) return tableError("NO_DATA", "No data returned");
  if (typeof data[0] !== "object" || data[0] === null) {
    return [["Value"], ...data.map((entry) => [valueToCell(entry)])];
  }

  return recordsToTable(
    data.map((entry) => flattenRecord(entry as Record<string, unknown>)),
  );
}

function selectRecordEntries(
  value: Record<string, unknown>,
  include: (key: string, entry: unknown) => boolean,
): Record<string, unknown> {
  const selected: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (include(key, entry)) selected[key] = entry;
  });
  return selected;
}

function primaryCollectionToTable(
  data: Record<string, unknown>,
): Table | undefined {
  const preferredCollections = [
    "inventories",
    "countries",
    "well_permits",
    "top_states",
    "data_sources",
  ];
  const candidates = Object.entries(data)
    .filter(
      ([, value]) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => isRecord(entry)),
    )
    .sort(([leftKey, left], [rightKey, right]) => {
      const leftPriority = preferredCollections.indexOf(leftKey);
      const rightPriority = preferredCollections.indexOf(rightKey);
      if (leftPriority !== -1 || rightPriority !== -1) {
        if (leftPriority === -1) return 1;
        if (rightPriority === -1) return -1;
        return leftPriority - rightPriority;
      }
      return (right as unknown[]).length - (left as unknown[]).length;
    });

  if (candidates.length === 0) return undefined;

  const [collectionKey, collection] = candidates[0] as [
    string,
    Array<Record<string, unknown>>,
  ];
  const contextSource = selectRecordEntries(
    data,
    (key, value) => key !== collectionKey && !Array.isArray(value),
  );
  const context = flattenRecord(contextSource, "context");
  return recordsToTable(
    collection.map((record) => ({
      ...flattenRecord(record),
      ...context,
    })),
  );
}

function bunkerPortsToTable(
  ports: Record<string, unknown>,
): Table | undefined {
  const records: Array<Record<string, unknown>> = [];
  Object.entries(ports).forEach(([portCode, rawPort]) => {
    if (!isRecord(rawPort) || !Array.isArray(rawPort.prices)) return;
    const port = isRecord(rawPort.port)
      ? flattenRecord(rawPort.port, "port")
      : { "port.code": portCode };
    rawPort.prices.forEach((rawPrice) => {
      if (isRecord(rawPrice)) {
        records.push({
          ...port,
          ...flattenRecord(rawPrice),
        });
      }
    });
  });
  return records.length > 0 ? recordsToTable(records) : undefined;
}

function pricesHashToTable(prices: Record<string, unknown>): Table {
  const entries = Object.entries(prices);
  if (entries.length === 0) return tableError("NO_DATA", "No data returned");

  const objectEntries = entries.filter(
    ([, value]) =>
      value !== null && typeof value === "object" && !Array.isArray(value),
  ) as Array<[string, Record<string, unknown>]>;

  if (objectEntries.length !== entries.length) {
    return [
      ["Code", "Value"],
      ...entries.map(([code, value]): Cell[] => [code, valueToCell(value)]),
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
    ...objectEntries.map(([code, value]): Cell[] => [
      code,
      ...fields.map((field) => cellFor(field, value[field])),
    ]),
  ];
}

/**
 * Flattens a nested futures shape where each contract carries an array of
 * per-day (or per-tick) records, producing one worksheet row per
 * contract-day. Parent identity fields are prefixed onto every child row.
 *
 * Handles #52 shapes: /ohlc & /historical (contracts[].daily_data[]),
 * /intraday (contracts[].price_data[]).
 */
function flattenNestedContracts(
  contracts: any[],
  childKey: string,
  parentFields: string[],
): Table | undefined {
  const rows: Array<Record<string, unknown>> = [];
  for (const contract of contracts) {
    const children = contract?.[childKey];
    if (!Array.isArray(children)) return undefined;
    const parent: Record<string, unknown> = {};
    for (const field of parentFields) parent[field] = contract?.[field];
    for (const child of children) {
      rows.push({ ...parent, ...(child as Record<string, unknown>) });
    }
  }
  if (rows.length === 0) return tableError("NO_DATA", "No data returned");
  return arrayToTable(rows);
}

/** /spread-history: spread_data[] with nested front/back contract objects. */
function spreadHistoryToTable(spreadData: any[]): Table {
  if (spreadData.length === 0) return tableError("NO_DATA", "No data returned");
  const rows = spreadData.map((entry: any) => ({
    trading_date: entry?.trading_date,
    front_month: entry?.front_contract?.contract_month,
    front_price: entry?.front_contract?.price,
    back_month: entry?.back_contract?.contract_month,
    back_price: entry?.back_contract?.price,
    spread_value: entry?.spread_value,
    spread_percentage: entry?.spread_percentage,
  }));
  return arrayToTable(rows);
}

/** /spreads: spreads[].daily_data[] flattened one row per spread-day. */
function spreadsToTable(spreads: any[]): Table {
  const flattened = flattenNestedContracts(spreads, "daily_data", [
    "front_contract",
    "back_contract",
    "spread_type",
  ]);
  return flattened ?? tableError("NO_DATA", "No data returned");
}

/** Renders any of the root-level futures shapes (#52). */
function futuresToTable(payload: any): Table {
  if (Array.isArray(payload?.spread_data)) {
    return spreadHistoryToTable(payload.spread_data);
  }
  if (Array.isArray(payload?.spreads)) {
    return spreadsToTable(payload.spreads);
  }

  const contracts = payload?.contracts;
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return tableError("NO_DATA", "No data returned");
  }

  // /ohlc & /historical: contracts[].daily_data[]
  if (Array.isArray(contracts[0]?.daily_data)) {
    const flattened = flattenNestedContracts(contracts, "daily_data", [
      "contract_month",
    ]);
    if (flattened) return flattened;
  }
  // /intraday: contracts[].price_data[]
  if (Array.isArray(contracts[0]?.price_data)) {
    const flattened = flattenNestedContracts(contracts, "price_data", [
      "contract_month",
      "contract_code",
    ]);
    if (flattened) return flattened;
  }

  // Base curve and /curve: flat contract rows.
  return arrayToTable(contracts);
}

function isFuturesPayload(payload: any): boolean {
  return (
    payload != null &&
    typeof payload === "object" &&
    (Array.isArray(payload.contracts) ||
      Array.isArray(payload.spreads) ||
      Array.isArray(payload.spread_data))
  );
}

function responseToTable(payload: any): Table {
  // Futures endpoints (#52) return shapes at the ROOT level (no data envelope).
  if (isFuturesPayload(payload)) {
    return futuresToTable(payload);
  }

  let data = payload?.data;

  // Status and analytics endpoints return useful fields at the root.
  if ((data === undefined || data === null) && isRecord(payload)) {
    const rootData = selectRecordEntries(
      payload,
      (key) => key !== "data",
    );
    const meaningfulKeys = Object.keys(rootData).filter(
      (key) => key !== "status",
    );
    if (meaningfulKeys.length > 0 || !("data" in payload)) {
      data = rootData;
    }
  }

  // #54: /prices/all and /prices/all/health double-wrap in data.data.
  if (
    data &&
    typeof data === "object" &&
    data.data &&
    typeof data.data === "object"
  ) {
    data = data.data;
  }

  if (Array.isArray(data)) {
    return arrayToTable(data);
  }

  if (data && typeof data === "object") {
    // #54: diesel-prices buries the price inside data.regional_average.
    if (
      data.regional_average &&
      typeof data.regional_average === "object" &&
      !Array.isArray(data.regional_average)
    ) {
      return objectToTable(data.regional_average as Record<string, unknown>);
    }

    // #54: /prices/all/health exposes a summary object (and no prices).
    if (
      data.summary &&
      typeof data.summary === "object" &&
      !Array.isArray(data.summary) &&
      !data.prices
    ) {
      return objectToTable(data.summary as Record<string, unknown>);
    }

    if (Array.isArray(data.prices)) {
      const table = arrayToTable(data.prices);
      if (Array.isArray(data.missing) && data.missing.length > 0) {
        const codes = data.missing
          .map((code: unknown) => String(code))
          .filter(Boolean)
          .join(", ");
        return appendNoteRow(table, `MISSING CODES: ${codes}`);
      }
      return table;
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
      if (commodities.length === 0)
        return tableError("NO_DATA", "No data returned");
      return [
        ["Code", "Name", "Category"],
        ...commodities.map((commodity: any) => [
          String(commodity.code || ""),
          String(commodity.name || commodity.code || ""),
          String(commodity.category || ""),
        ]),
      ];
    }

    if (isRecord(data.ports)) {
      const bunkerTable = bunkerPortsToTable(data.ports);
      if (bunkerTable) return bunkerTable;
    }

    const collectionTable = primaryCollectionToTable(data);
    if (collectionTable) return collectionTable;

    return objectToTable(data);
  }

  return tableError("NO_DATA", "No data returned");
}

/**
 * #53: past_week / past_month silently return only the ~100 most recent
 * intraday ticks (~1 day), not the labeled span. When the cap is hit we
 * append a padded note row so the truncation is visible in the worksheet
 * and steer the user to /v1/prices/historical for the full range.
 */
const TRUNCATION_TICK_CAP = 100;

function truncationNote(path: string, payload: any): string | undefined {
  const match = /\/v1\/prices\/(past_week|past_month)$/.exec(
    (path || "").trim(),
  );
  if (!match) return undefined;
  const prices = payload?.data?.prices;
  if (!Array.isArray(prices) || prices.length < TRUNCATION_TICK_CAP) {
    return undefined;
  }
  return (
    `TRUNCATED: /v1/prices/${match[1]} returned only the ${TRUNCATION_TICK_CAP} ` +
    `most recent ticks (~1 day), not the full ${match[1].replace("past_", "")}. ` +
    `Use /v1/prices/historical with start_date and end_date for the full range.`
  );
}

function appendNoteRow(table: Table, note: string): Table {
  const width = table[0]?.length ?? 1;
  const row = [note, ...Array(Math.max(0, width - 1)).fill("")];
  return [...table, row];
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
    const data = payload?.data;
    if (data === null || data === undefined) {
      return cellError(
        "NO_DATA",
        "No data returned. Check the commodity code or query",
      );
    }
    if (typeof data !== "object") {
      return cellError("INVALID_RESPONSE", "API returned a malformed price");
    }
    if (typeof data.error === "string") {
      return cellError(
        "INVALID_CODE",
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Invalid commodity code",
      );
    }
    const price = data.price;
    if (price === null || price === undefined) {
      return cellError("NO_DATA", "No numeric price returned");
    }
    if (typeof price !== "number") {
      return cellError("INVALID_RESPONSE", "API returned a malformed price");
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
): Promise<Table> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return tableError("AUTH_REQUIRED", "Set API key in OilPrice pane");
  }

  try {
    const payload = await apiGet(path, query, apiKey);
    const table = responseToTable(payload);
    const note = truncationNote(path, payload);
    return note ? appendNoteRow(table, note) : table;
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
export async function oilpriceCodes(): Promise<Table> {
  return oilpriceGet("/v1/commodities");
}

/** Fetches the latest-quote object for a code, or throws a ResponseError. */
async function fetchLatestQuote(code: string): Promise<Record<string, any>> {
  const normalizedCode = (code || "").trim().toUpperCase();
  if (!normalizedCode) {
    throw {
      code: "INVALID_CODE",
      message: "Enter a commodity code",
    } as ResponseError;
  }
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw {
      code: "AUTH_REQUIRED",
      message: "Set API key in OilPrice pane",
    } as ResponseError;
  }
  const payload = await apiGet(
    "/v1/prices/latest",
    `by_code=${encodeURIComponent(normalizedCode)}`,
    apiKey,
  );
  const data = payload?.data;
  if (!data || typeof data !== "object") {
    throw {
      code: "NO_DATA",
      message: "No data returned. Check the commodity code or query",
    } as ResponseError;
  }
  // Belt-and-suspenders: if the API ever returns HTTP 200 with an error body
  // (e.g. { data: { error: "invalid_code", message: "Did you mean ..." } }),
  // surface the message instead of treating the error object as a valid quote.
  if (typeof (data as Record<string, unknown>).error === "string") {
    const message = (data as Record<string, unknown>).message;
    throw {
      code: "INVALID_CODE",
      message:
        typeof message === "string" && message.trim()
          ? message
          : "Invalid commodity code",
    } as ResponseError;
  }
  return data;
}

/**
 * Reports the freshness of the latest quote (#55) so stale data is
 * distinguishable from fresh — e.g. "current" vs "stale". Uses the API's
 * data_status, falling back to the stale boolean.
 * @customfunction STATUS
 * @param code Commodity code, for example BALTIC_CAPESIZE_INDEX.
 * @returns "current", "stale", or another API-reported status string.
 */
export async function oilpricePriceStatus(code: string): Promise<string> {
  try {
    const data = await fetchLatestQuote(code);
    if (typeof data.data_status === "string") return data.data_status;
    if (typeof data?.freshness?.status === "string") {
      return data.freshness.status;
    }
    if (typeof data.stale === "boolean") {
      return data.stale ? "stale" : "current";
    }
    return cellError("NO_DATA", "No status returned");
  } catch (error) {
    if (isResponseError(error)) return cellError(error.code, error.message);
    return cellError("NETWORK_ERROR", "Cannot reach API");
  }
}

/**
 * Exposes the currency and unit of the latest quote (#56) so a value like
 * NATURAL_GAS_GBP 142.19 is understood as pence/therm, not USD. PRICE stays
 * a bare number; this companion makes the units explicit.
 * @customfunction UNIT
 * @param code Commodity code, for example NATURAL_GAS_GBP.
 * @returns "currency/unit", for example "GBp/therm" or "USD/barrel".
 */
export async function oilpricePriceUnit(code: string): Promise<string> {
  try {
    const data = await fetchLatestQuote(code);
    const currency = typeof data.currency === "string" ? data.currency : "";
    const unit = typeof data.unit === "string" ? data.unit : "";
    if (!currency && !unit) return cellError("NO_DATA", "No unit returned");
    return unit ? `${currency}/${unit}` : currency;
  } catch (error) {
    if (isResponseError(error)) return cellError(error.code, error.message);
    return cellError("NETWORK_ERROR", "Cannot reach API");
  }
}

/**
 * Spills a compact table describing the latest quote — price, currency, unit,
 * the human-formatted value, and freshness — covering both units (#56) and
 * staleness (#55) in one place without changing the numeric PRICE contract.
 * @customfunction INFO
 * @param code Commodity code, for example NATURAL_GAS_GBP.
 * @returns A two-column Field/Value table.
 */
export async function oilpricePriceInfo(code: string): Promise<Table> {
  try {
    const data = await fetchLatestQuote(code);
    const fields = [
      "code",
      "price",
      "currency",
      "unit",
      "formatted",
      "source",
      "source_description",
      "as_of",
      "collected_at",
      "data_status",
      "stale",
      "age_days",
    ];
    // A dimensionless index (currency INDEX / unit index) has no monetary unit,
    // so the API's "$"-prefixed `formatted` (e.g. "$4655.00") is misleading.
    // Rebuild the display from price + unit instead (e.g. "4655 index").
    const isIndex =
      (typeof data.currency === "string" &&
        data.currency.toUpperCase() === "INDEX") ||
      (typeof data.unit === "string" && data.unit.toLowerCase() === "index");
    return [
      ["Field", "Value"],
      ...fields.map((field): Cell[] => {
        if (field === "source_description") {
          return [field, valueToCell(data?.metadata?.source_description)];
        }
        if (field === "formatted" && isIndex) {
          const unit = typeof data.unit === "string" ? data.unit : "index";
          return ["formatted", `${valueToCell(data.price)} ${unit}`.trim()];
        }
        return [field, cellFor(field, data[field])];
      }),
    ];
  } catch (error) {
    if (isResponseError(error)) return tableError(error.code, error.message);
    return tableError("NETWORK_ERROR", "Cannot reach API");
  }
}

export function registerOilpriceFunctions(): void {
  CustomFunctions.associate("PRICE", oilpricePrice);
  CustomFunctions.associate("GET", oilpriceGet);
  CustomFunctions.associate("CODES", oilpriceCodes);
  CustomFunctions.associate("STATUS", oilpricePriceStatus);
  CustomFunctions.associate("UNIT", oilpricePriceUnit);
  CustomFunctions.associate("INFO", oilpricePriceInfo);
}

registerOilpriceFunctions();
