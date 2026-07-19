/**
 * Expert-review defect guards (#51, children #52/#55/#56).
 *
 * Four correctness bugs that shipped in PR #60 and break the customer's
 * spreadsheet use case. Every assertion runs against minimized production-shape
 * fixtures in tests/fixtures/api/*.json (or an equivalent response shape).
 *
 *   P0-1  Numeric cells must be typeof "number", not text — text cells are
 *         left-aligned, non-chartable, and break AVERAGE/SUM. The API also
 *         returns OHLC/curve/spread numerics as JSON STRINGS.
 *   P0-2  functions.json ids / associate names must NOT make PRICE both a
 *         callable function and a namespace parent — Excel forbids that.
 *         The three new leaves are STATUS / UNIT / INFO.
 *   P1-1  A dimensionless index (currency INDEX) must not surface a "$" price.
 *   P1-2  An invalid code must surface the API's "did you mean" message,
 *         not a blank / #NO_DATA.
 */

import * as fs from "fs";
import * as path from "path";

const mockStorage = {
  getItem: jest.fn().mockResolvedValue("test-api-key-123"),
  setItem: jest.fn().mockResolvedValue(undefined),
};

(globalThis as any).OfficeRuntime = { storage: mockStorage };
(globalThis as any).fetch = jest.fn();
(globalThis as any).CustomFunctions = { associate: jest.fn() } as any;

import {
  oilpriceGet,
  oilpricePrice,
  oilpricePriceInfo,
  oilpricePriceStatus,
  oilpricePriceUnit,
} from "../../src/functions/functions";

const FIXTURE_DIR = path.join(__dirname, "..", "fixtures", "api");

function loadFixture(name: string): any {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURE_DIR, `${name}.json`), "utf8"),
  );
}

function mockFetchOnce(fixture: any, init?: { ok?: boolean; status?: number }) {
  ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers: new Headers({ "x-request-id": "fixture" }),
    json: async () => fixture,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue("test-api-key-123");
});

// ---------------------------------------------------------------------------
// P0-1 — numbers must render as numbers, not text
// ---------------------------------------------------------------------------
describe("P0-1 numeric cells are real numbers (chartable, AVERAGE/SUM-safe)", () => {
  it("Brent base curve: OHLC + last_price cells are typeof number", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-base"));
    const table = await oilpriceGet("/v1/futures/ice-brent");

    const header = table[0] as string[];
    const row = table[1];
    // last_price is a JSON number in the payload; open/close/high/low are STRINGS.
    expect(typeof row[header.indexOf("last_price")]).toBe("number");
    expect(row[header.indexOf("last_price")]).toBe(88.1);
    expect(typeof row[header.indexOf("open")]).toBe("number");
    expect(row[header.indexOf("open")]).toBe(84.95);
    expect(typeof row[header.indexOf("close")]).toBe("number");
    expect(row[header.indexOf("close")]).toBe(88.26);
    expect(typeof row[header.indexOf("change_percent")]).toBe("number");
    // boolean stays boolean (not the string "true")
    expect(typeof row[header.indexOf("is_front_month")]).toBe("boolean");
    // non-numeric identity fields stay strings
    expect(typeof row[header.indexOf("code")]).toBe("string");
    expect(typeof row[header.indexOf("contract_month")]).toBe("string");
  });

  it("OHLC daily_data string numerics coerce to number", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-ohlc"));
    const table = await oilpriceGet("/v1/futures/ice-brent/ohlc");
    const header = table[0] as string[];
    const row = table[1];
    expect(typeof row[header.indexOf("open")]).toBe("number");
    expect(row[header.indexOf("open")]).toBe(78.61);
    expect(typeof row[header.indexOf("settlement")]).toBe("number");
    // null stays blank, not coerced to 0
    expect(row[header.indexOf("volume")]).toBe("");
  });

  it("spread history string spread_value/front_price coerce to number", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-spread-history"));
    const table = await oilpriceGet(
      "/v1/futures/ice-brent/spread-history",
      "front_contract=BRENT_FUTURES_2026_09&back_contract=BRENT_FUTURES_2026_10",
    );
    const header = table[0] as string[];
    const row = table[1];
    expect(typeof row[header.indexOf("front_price")]).toBe("number");
    expect(row[header.indexOf("front_price")]).toBe(79.0);
    expect(typeof row[header.indexOf("spread_value")]).toBe("number");
  });

  it("a spot price cell (prices/all) is typeof number", async () => {
    mockFetchOnce(loadFixture("prices-all"));
    const table = await oilpriceGet("/v1/prices/all");
    const header = table[0] as string[];
    const azeri = table.find((r) => r[0] === "AZERI_LIGHT_USD")!;
    expect(typeof azeri[header.indexOf("price")]).toBe("number");
    expect(azeri[header.indexOf("price")]).toBe(92.84);
  });

  it("PRICE.INFO price cell is typeof number", async () => {
    mockFetchOnce(loadFixture("prices-latest-natural-gas-gbp"));
    const table = await oilpricePriceInfo("NATURAL_GAS_GBP");
    const priceRow = table.find((r) => r[0] === "price")!;
    expect(typeof priceRow[1]).toBe("number");
    expect(priceRow[1]).toBe(142.19);
  });
});

// ---------------------------------------------------------------------------
// P0-2 — no PRICE.* namespace collision
// ---------------------------------------------------------------------------
describe("P0-2 the three new functions are STATUS/UNIT/INFO (no PRICE.* collision)", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "..", "src", "functions", "functions.json"),
      "utf8",
    ),
  );
  const ids = manifest.functions.map((f: any) => f.id);

  it("functions.json uses STATUS/UNIT/INFO ids", () => {
    expect(ids).toContain("STATUS");
    expect(ids).toContain("UNIT");
    expect(ids).toContain("INFO");
  });

  it("functions.json has no PRICE.* dotted ids", () => {
    expect(ids).not.toContain("PRICE.STATUS");
    expect(ids).not.toContain("PRICE.UNIT");
    expect(ids).not.toContain("PRICE.INFO");
    expect(ids.filter((id: string) => id.startsWith("PRICE."))).toEqual([]);
  });

  it("the bare PRICE/GET/CODES ids are unchanged", () => {
    expect(ids).toContain("PRICE");
    expect(ids).toContain("GET");
    expect(ids).toContain("CODES");
  });

  it("associate() registers STATUS/UNIT/INFO, never PRICE.*", () => {
    const {
      registerOilpriceFunctions,
    } = require("../../src/functions/functions");
    (globalThis as any).CustomFunctions.associate.mockClear();
    registerOilpriceFunctions();
    const names = (
      (globalThis as any).CustomFunctions.associate as jest.Mock
    ).mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain("STATUS");
    expect(names).toContain("UNIT");
    expect(names).toContain("INFO");
    expect(names.filter((n: string) => n.startsWith("PRICE."))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// P1-1 — dimensionless index must not show "$"
// ---------------------------------------------------------------------------
describe("P1-1 INFO does not surface '$' for a dimensionless index", () => {
  it("BALTIC index INFO contains no '$' (currency INDEX)", async () => {
    mockFetchOnce(loadFixture("prices-latest-baltic-stale"));
    const table = await oilpricePriceInfo("BALTIC_CAPESIZE_INDEX");
    const flat = new Map(table.map((r) => [r[0], r[1]]));
    // currency is INDEX / unit is index in the real fixture
    expect(flat.get("currency")).toBe("INDEX");
    const rendered = JSON.stringify(table);
    expect(rendered).not.toContain("$");
  });

  it("INFO exposes the API source, source timestamp, and stale state", async () => {
    mockFetchOnce(loadFixture("prices-latest-baltic-stale"));
    const table = await oilpricePriceInfo("BALTIC_CAPESIZE_INDEX");
    const flat = new Map(table.map((row) => [row[0], row[1]]));

    expect(flat.get("source")).toBe("market_reporting");
    expect(flat.get("source_description")).toBe(
      "Aggregated from published market sources",
    );
    expect(flat.get("as_of")).toBe("2026-07-10T14:24:30.140Z");
    expect(flat.get("stale")).toBe(true);
    expect(flat.get("data_status")).toBe("stale");
  });
});

// ---------------------------------------------------------------------------
// P1-2 — invalid code surfaces the API "did you mean" message
// ---------------------------------------------------------------------------
describe("P1-2 invalid code surfaces the API suggestion, not a blank", () => {
  // Live API returns HTTP 400 with { status:"fail", data:{ error, message, ... } }.
  it("PRICE surfaces the 'Did you mean' message", async () => {
    mockFetchOnce(loadFixture("prices-latest-invalid-code"), {
      ok: false,
      status: 400,
    });
    const result = await oilpricePrice("EUA_CARBON_EUR");
    expect(typeof result).toBe("string");
    expect(result as string).toContain("Did you mean");
  });

  it("PRICE.STATUS surfaces the suggestion message", async () => {
    mockFetchOnce(loadFixture("prices-latest-invalid-code"), {
      ok: false,
      status: 400,
    });
    const result = await oilpricePriceStatus("EUA_CARBON_EUR");
    expect(result).toContain("Did you mean");
  });

  it("PRICE.UNIT surfaces the suggestion message", async () => {
    mockFetchOnce(loadFixture("prices-latest-invalid-code"), {
      ok: false,
      status: 400,
    });
    const result = await oilpricePriceUnit("EUA_CARBON_EUR");
    expect(result).toContain("Did you mean");
  });

  it("PRICE.INFO surfaces the suggestion message as a table error", async () => {
    mockFetchOnce(loadFixture("prices-latest-invalid-code"), {
      ok: false,
      status: 400,
    });
    const table = await oilpricePriceInfo("EUA_CARBON_EUR");
    expect(JSON.stringify(table)).toContain("Did you mean");
  });

  it("also handles the HTTP-200-with-error variant (fetchLatestQuote guard)", async () => {
    // Belt-and-suspenders: if the API ever returns 200 with a data.error body.
    mockFetchOnce({
      data: {
        error: "invalid_code",
        message: "Code 'X' not found. Did you mean: 'Y'?",
      },
    });
    const result = await oilpricePriceStatus("X");
    expect(result).toContain("Did you mean");
  });
});
