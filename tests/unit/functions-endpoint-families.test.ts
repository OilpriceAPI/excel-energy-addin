/**
 * Production-shaped endpoint-family and renderer regression coverage (#57/#59).
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
} from "../../src/functions/functions";

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "fixtures",
      "api",
      "endpoint-families.json",
    ),
    "utf8",
  ),
);

function mockFetchOnce(body: unknown): void {
  ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers({ "x-request-id": "fixture" }),
    json: async () => body,
  });
}

function hasBlobCell(table: unknown[][]): boolean {
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

describe("#57 endpoint families", () => {
  const cases = [
    ["/v1/rig-counts/latest", "rig_counts"],
    ["/v1/storage/cushing", "storage"],
    ["/v1/ei/oil_inventories/latest", "oil_inventories"],
    ["/v1/ei/opec_productions/latest", "opec"],
    ["/v1/bunker-fuels/all", "bunker_fuels"],
    ["/v1/well-production/summary", "well_production"],
    ["/v1/ei/well-permits/preview", "well_permits"],
    ["/v1/drilling-intelligence/summary", "drilling"],
    ["/v1/analytics/statistics", "analytics"],
  ] as const;

  it.each(cases)("allows and renders %s without JSON blobs", async (endpoint, key) => {
    mockFetchOnce(fixture[key]);

    const table = await oilpriceGet(endpoint);

    expect(table[0][0]).not.toContain("#");
    expect(table.length).toBeGreaterThan(1);
    expect(hasBlobCell(table)).toBe(false);
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      `https://api.oilpriceapi.com${endpoint}`,
      expect.any(Object),
    );
  });

  it("renders EI inventory rows with report context", async () => {
    mockFetchOnce(fixture.oil_inventories);

    const table = await oilpriceGet("/v1/ei/oil_inventories/latest");
    const header = table[0];

    expect(header).toContain("product");
    expect(header).toContain("volume_mmbbl");
    expect(header).toContain("context.report_date");
    expect(table[1][header.indexOf("volume_mmbbl")]).toBe(411.68);
    expect(table[1][header.indexOf("context.report_date")]).toBe("2026-07-22");
  });

  it("renders OPEC countries as numeric production rows", async () => {
    mockFetchOnce(fixture.opec);

    const table = await oilpriceGet("/v1/ei/opec_productions/latest");
    const header = table[0];

    expect(header).toContain("country");
    expect(header).toContain("production_mbpd");
    expect(header).toContain("context.opec_total");
    expect(table[1][header.indexOf("production_mbpd")]).toBe(6.768);
  });

  it("flattens bunker ports and grades to one row per port-grade", async () => {
    mockFetchOnce(fixture.bunker_fuels);

    const table = await oilpriceGet("/v1/bunker-fuels/all");
    const header = table[0];

    expect(table).toHaveLength(4);
    expect(header).toContain("port.code");
    expect(header).toContain("grade");
    expect(header).toContain("price");
    expect(table[1][header.indexOf("port.code")]).toBe("SIN");
    expect(typeof table[1][header.indexOf("price")]).toBe("number");
  });

  it("flattens permit operator, well, and provenance context", async () => {
    mockFetchOnce(fixture.well_permits);

    const table = await oilpriceGet("/v1/ei/well-permits/preview");
    const header = table[0];

    expect(header).toContain("operator.name");
    expect(header).toContain("well.name");
    expect(header).toContain("provenance.source");
    expect(header).toContain("context.meta.bounded");
    expect(table[1][header.indexOf("operator.name")]).toBe(
      "R. LACY SERVICES, LTD.",
    );
  });

  it("flattens nested summary and root-level analytics objects", async () => {
    mockFetchOnce(fixture.drilling);
    const drilling = await oilpriceGet("/v1/drilling-intelligence/summary");
    expect(drilling).toContainEqual(["rig_counts.US_RIG_COUNT", 588]);
    expect(drilling).toContainEqual(["well_permits.by_state.TX", 375]);

    mockFetchOnce(fixture.analytics);
    const analytics = await oilpriceGet(
      "/v1/analytics/statistics",
      "code=BRENT_CRUDE_USD&period=30d",
    );
    expect(analytics).toContainEqual(["statistics.z_score", 2.02]);
    expect(analytics).toContainEqual(["statistics.percentile", 95.8]);
  });
});

describe("#59 response polish", () => {
  it("flattens multi-code freshness/changes and surfaces missing codes", async () => {
    const multi = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "fixtures",
          "api",
          "prices-latest-multi.json",
        ),
        "utf8",
      ),
    );
    multi.data.missing = ["INVALID_CODE"];
    mockFetchOnce(multi);

    const table = await oilpriceGet(
      "/v1/prices/latest",
      "by_code=BRENT_CRUDE_USD,WTI_USD,INVALID_CODE",
    );
    const header = table[0];

    expect(header).toContain("freshness.status");
    expect(header).toContain("changes.24h.amount");
    expect(hasBlobCell(table)).toBe(false);
    expect(table[table.length - 1][0]).toContain(
      "MISSING CODES: INVALID_CODE",
    );
  });

  it("renders root status and nested category maps as readable fields", async () => {
    mockFetchOnce({ status: "operational", version: "v1" });
    await expect(oilpriceGet("/v1/status")).resolves.toContainEqual([
      "status",
      "operational",
    ]);

    mockFetchOnce({
      status: "success",
      data: { categories: { oil: 12, natural_gas: 8 } },
    });
    await expect(
      oilpriceGet("/v1/commodities/categories"),
    ).resolves.toContainEqual(["categories.oil", 12]);
  });

  it("returns NO_DATA rather than malformed response for a null price", async () => {
    mockFetchOnce({
      status: "success",
      data: {
        code: "URANIUM_USD",
        price: null,
        currency: "USD",
        unit: "pound",
      },
    });

    await expect(oilpricePrice("URANIUM_USD")).resolves.toBe(
      "#NO_DATA: No numeric price returned",
    );
  });
});
