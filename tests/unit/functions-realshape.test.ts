/**
 * Real-shape rendering tests (#58 root cause).
 *
 * These tests load fixtures captured from the LIVE OilPriceAPI
 * (tests/fixtures/api/*.json, captured 2026-07-18) and assert the RENDERED
 * worksheet table. The previous suite asserted against a synthetic
 * `{ data: { ok: true } }` mock, which let real-shape breakage ship
 * (see issues #52-#56). Every assertion here is against a real response body.
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

function mockFetchOnce(fixture: any): void {
  ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "x-request-id": "fixture" }),
    json: async () => fixture,
  });
}

/** True when any cell looks like an unrendered JSON blob (the bug symptom). */
function hasBlobCell(table: string[][]): boolean {
  return table.some((row) =>
    row.some(
      (cell) =>
        typeof cell === "string" &&
        (cell.includes('{"') ||
          cell.includes('":') ||
          cell.includes("[object Object]")),
    ),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getItem.mockResolvedValue("test-api-key-123");
});

describe("#52 Futures render as tables (not #NO_DATA / blob)", () => {
  it("renders the futures base curve (root-level contracts[])", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-base"));

    const table = await oilpriceGet("/v1/futures/ice-brent");

    expect(table[0]).toEqual([
      "code",
      "contract_month",
      "last_price",
      "currency",
      "updated_at",
      "settlement_date",
      "open",
      "close",
      "high",
      "low",
      "change_percent",
      "days_to_expiry",
      "contract_status",
      "is_front_month",
      "expiry_date",
    ]);
    // Front-month contract row, real values.
    expect(table[1]).toEqual([
      "BRENT_FUTURES_2026_09",
      "2026-09",
      "88.1",
      "USD",
      "2026-07-18T04:25:18Z",
      "2026-07-17",
      "84.95",
      "88.26",
      "88.35",
      "83.73",
      "3.8964",
      "13",
      "front_month",
      "true",
      "2026-07-31",
    ]);
    expect(table.length).toBeGreaterThan(2); // multiple contracts
    expect(hasBlobCell(table)).toBe(false);
  });

  it("renders natural-gas futures (different family, same shape)", async () => {
    mockFetchOnce(loadFixture("futures-natural-gas-base"));

    const table = await oilpriceGet("/v1/futures/natural-gas");

    expect(table[0][0]).toBe("code");
    expect(table[1][0]).toBe("NATGAS_FUTURES_2026_08");
    expect(table[1][2]).toBe("2.92");
    expect(hasBlobCell(table)).toBe(false);
  });

  it("flattens /ohlc nested contracts[].daily_data[] to one row per contract-day", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-ohlc"));

    const table = await oilpriceGet("/v1/futures/ice-brent/ohlc");

    expect(table[0]).toEqual([
      "contract_month",
      "code",
      "trading_date",
      "open",
      "close",
      "high",
      "low",
      "volume",
      "open_interest",
      "change_percent",
      "settlement",
      "open_captured_at",
      "close_captured_at",
    ]);
    // First contract-day row.
    expect(table[1][0]).toBe("2026-08");
    expect(table[1][1]).toBe("BRENT_FUTURES_2026_08");
    expect(table[1][2]).toBe("2026-06-18");
    expect(table[1][3]).toBe("78.61"); // open
    expect(table.length).toBeGreaterThan(10); // many contract-days flattened
    expect(hasBlobCell(table)).toBe(false);
  });

  it("flattens /historical nested contracts[].daily_data[]", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-historical"));

    const table = await oilpriceGet("/v1/futures/ice-brent/historical");

    expect(table[0][0]).toBe("contract_month");
    expect(table[0]).toContain("trading_date");
    expect(table.length).toBeGreaterThan(50);
    expect(hasBlobCell(table)).toBe(false);
  });

  it("renders /curve (root front_month + contracts[])", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-curve"));

    const table = await oilpriceGet("/v1/futures/ice-brent/curve");

    expect(table[0]).toEqual([
      "contract_month",
      "contract_code",
      "settlement_price",
      "trading_date",
      "months_to_expiry",
    ]);
    expect(table[1]).toEqual([
      "2026-09",
      "BRENT_FUTURES_2026_09",
      "88.26",
      "2026-07-17",
      "2",
    ]);
    expect(hasBlobCell(table)).toBe(false);
  });

  it("flattens /intraday nested contracts[].price_data[]", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-intraday"));

    const table = await oilpriceGet("/v1/futures/ice-brent/intraday");

    expect(table[0]).toEqual([
      "contract_month",
      "contract_code",
      "timestamp",
      "price",
      "currency",
      "volume",
    ]);
    expect(table[1][0]).toBe("2026-09");
    expect(table[1][3]).toBe("88.1");
    expect(hasBlobCell(table)).toBe(false);
  });

  it("flattens /spreads nested spreads[].daily_data[]", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-spreads"));

    const table = await oilpriceGet("/v1/futures/ice-brent/spreads");

    expect(table[0]).toEqual([
      "front_contract",
      "back_contract",
      "spread_type",
      "trading_date",
      "front_price",
      "back_price",
      "spread_value",
      "spread_percentage",
    ]);
    expect(table[1][0]).toBe("2026-08");
    expect(table[1][1]).toBe("2026-09");
    expect(hasBlobCell(table)).toBe(false);
  });

  it("flattens /spread-history nested spread_data[] (nested front/back objects)", async () => {
    mockFetchOnce(loadFixture("futures-ice-brent-spread-history"));

    const table = await oilpriceGet(
      "/v1/futures/ice-brent/spread-history",
      "front_contract=BRENT_FUTURES_2026_09&back_contract=BRENT_FUTURES_2026_10",
    );

    expect(table[0]).toEqual([
      "trading_date",
      "front_month",
      "front_price",
      "back_month",
      "back_price",
      "spread_value",
      "spread_percentage",
    ]);
    expect(table[1][0]).toBe("2026-06-18");
    expect(table[1][1]).toBe("2026-09");
    expect(table[1][2]).toBe("79.0");
    expect(hasBlobCell(table)).toBe(false);
  });
});

describe("#54 Blob endpoints render as proper tables", () => {
  it("renders diesel-prices from data.regional_average (price no longer buried)", async () => {
    mockFetchOnce(loadFixture("diesel-prices"));

    const table = await oilpriceGet("/v1/diesel-prices");

    const flat = new Map(table.map((r) => [r[0], r[1]]));
    expect(flat.get("price")).toBe("4.578");
    expect(flat.get("currency")).toBe("USD");
    expect(flat.get("unit")).toBe("gallon");
    expect(flat.get("region")).toBe("national");
    expect(hasBlobCell(table)).toBe(false);
  });

  it("unwraps the double data.data envelope for /prices/all", async () => {
    mockFetchOnce(loadFixture("prices-all"));

    const table = await oilpriceGet("/v1/prices/all");

    expect(table[0][0]).toBe("Code");
    expect(table[0]).toContain("price");
    expect(table[0]).toContain("stale");
    // A real code row is present with a numeric price.
    const azeri = table.find((r) => r[0] === "AZERI_LIGHT_USD");
    expect(azeri).toBeDefined();
    expect(azeri![table[0].indexOf("price")]).toBe("92.84");
    expect(hasBlobCell(table)).toBe(false);
  });

  it("unwraps the double data.data envelope for /prices/all/health (summary table)", async () => {
    mockFetchOnce(loadFixture("prices-all-health"));

    const table = await oilpriceGet("/v1/prices/all/health");

    const flat = new Map(table.map((r) => [r[0], r[1]]));
    expect(flat.get("fresh_count")).toBe("172");
    expect(flat.get("stale_count")).toBe("217");
    expect(flat.get("total_commodities")).toBe("389");
    expect(flat.get("health_percentage")).toBe("44.2");
    expect(hasBlobCell(table)).toBe(false);
  });
});

describe("#53 Truncation is surfaced, not silently misleading", () => {
  it("appends a truncation note when /past_week hits the 100-tick cap", async () => {
    mockFetchOnce(loadFixture("prices-past-week"));

    const table = await oilpriceGet(
      "/v1/prices/past_week",
      "by_code=BRENT_CRUDE_USD",
    );

    const noteRow = table[table.length - 1];
    expect(noteRow[0]).toMatch(/TRUNCATED/);
    expect(noteRow[0]).toMatch(/historical/);
    // Note row is padded to full table width (rectangular for Excel spill).
    expect(noteRow.length).toBe(table[0].length);
  });

  it("does NOT add a note for /past_day (a genuine ~1 day window)", async () => {
    mockFetchOnce(loadFixture("prices-past-day"));

    const table = await oilpriceGet(
      "/v1/prices/past_day",
      "by_code=BRENT_CRUDE_USD",
    );

    const anyNote = table.some((r) => String(r[0]).includes("TRUNCATED"));
    expect(anyNote).toBe(false);
  });
});

describe("#55 Freshness is distinguishable (PRICE.STATUS)", () => {
  it("reports 'current' for fresh Brent", async () => {
    mockFetchOnce(loadFixture("prices-latest-brent"));
    await expect(oilpricePriceStatus("BRENT_CRUDE_USD")).resolves.toBe(
      "current",
    );
  });

  it("reports 'stale' for the stale Baltic Capesize index", async () => {
    mockFetchOnce(loadFixture("prices-latest-baltic-stale"));
    await expect(oilpricePriceStatus("BALTIC_CAPESIZE_INDEX")).resolves.toBe(
      "stale",
    );
  });
});

describe("#56 Units are visible (PRICE.UNIT / PRICE.INFO)", () => {
  it("PRICE.UNIT exposes currency+unit so 142.19 is not misread as USD", async () => {
    mockFetchOnce(loadFixture("prices-latest-natural-gas-gbp"));
    await expect(oilpricePriceUnit("NATURAL_GAS_GBP")).resolves.toBe(
      "GBp/therm",
    );
  });

  it("PRICE.UNIT for Brent is USD/barrel", async () => {
    mockFetchOnce(loadFixture("prices-latest-brent"));
    await expect(oilpricePriceUnit("BRENT_CRUDE_USD")).resolves.toBe(
      "USD/barrel",
    );
  });

  it("PRICE.INFO returns a table with price, currency, unit, and freshness", async () => {
    mockFetchOnce(loadFixture("prices-latest-natural-gas-gbp"));

    const table = await oilpricePriceInfo("NATURAL_GAS_GBP");
    const flat = new Map(table.map((r) => [r[0], r[1]]));

    expect(flat.get("price")).toBe("142.19");
    expect(flat.get("currency")).toBe("GBp");
    expect(flat.get("unit")).toBe("therm");
    expect(flat.get("formatted")).toBe("142.19p");
    expect(flat.get("data_status")).toBe("current");
    expect(hasBlobCell(table)).toBe(false);
  });
});

describe("Helper edge cases and error handling", () => {
  it("PRICE.STATUS falls back to freshness.status then the stale boolean", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { freshness: { status: "delayed" } } }),
    });
    await expect(oilpricePriceStatus("X")).resolves.toBe("delayed");

    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { stale: true } }),
    });
    await expect(oilpricePriceStatus("X")).resolves.toBe("stale");
  });

  it("PRICE.STATUS surfaces auth-required without calling the API", async () => {
    mockStorage.getItem.mockResolvedValueOnce(null);
    await expect(oilpricePriceStatus("BRENT_CRUDE_USD")).resolves.toBe(
      "#AUTH_REQUIRED: Set API key in OilPrice pane",
    );
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  it("PRICE.STATUS surfaces an empty-code error", async () => {
    await expect(oilpricePriceStatus("")).resolves.toBe(
      "#INVALID_CODE: Enter a commodity code",
    );
  });

  it("PRICE.STATUS maps HTTP errors to worksheet errors", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    await expect(oilpricePriceStatus("BRENT_CRUDE_USD")).resolves.toBe(
      "#AUTH_INVALID: API key invalid or expired",
    );
  });

  it("PRICE.UNIT returns currency only when no unit is present", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { currency: "USD" } }),
    });
    await expect(oilpricePriceUnit("X")).resolves.toBe("USD");
  });

  it("PRICE.UNIT reports NO_DATA when currency and unit are both absent", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { price: 1 } }),
    });
    await expect(oilpricePriceUnit("X")).resolves.toBe(
      "#NO_DATA: No unit returned",
    );
  });

  it("PRICE.UNIT surfaces a network failure as a worksheet error", async () => {
    ((globalThis as any).fetch as jest.Mock).mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );
    await expect(oilpricePriceUnit("BRENT_CRUDE_USD")).resolves.toBe(
      "#NETWORK_OR_CORS: The browser or CORS policy blocked the API request",
    );
  });

  it("PRICE.INFO surfaces auth-required as a table error", async () => {
    mockStorage.getItem.mockResolvedValueOnce(null);
    await expect(oilpricePriceInfo("BRENT_CRUDE_USD")).resolves.toEqual([
      ["#AUTH_REQUIRED", "Set API key in OilPrice pane"],
    ]);
  });

  it("futures endpoints with no contracts render NO_DATA (not a blank spill)", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ contracts: [] }),
    });
    await expect(oilpriceGet("/v1/futures/ice-wti")).resolves.toEqual([
      ["#NO_DATA", "No data returned"],
    ]);
  });

  it("futures /spreads with an empty spreads array renders NO_DATA", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ spreads: [] }),
    });
    await expect(oilpriceGet("/v1/futures/ice-wti/spreads")).resolves.toEqual([
      ["#NO_DATA", "No data returned"],
    ]);
  });

  it("futures /spread-history with empty spread_data renders NO_DATA", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ spread_data: [] }),
    });
    await expect(
      oilpriceGet(
        "/v1/futures/ice-wti/spread-history",
        "front_contract=A&back_contract=B",
      ),
    ).resolves.toEqual([["#NO_DATA", "No data returned"]]);
  });
});
