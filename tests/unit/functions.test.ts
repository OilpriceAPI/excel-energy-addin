const mockStorage = {
  getItem: jest.fn().mockResolvedValue("test-api-key-123"),
};

(globalThis as any).OfficeRuntime = { storage: mockStorage };
(globalThis as any).fetch = jest.fn();
(globalThis as any).CustomFunctions = {
  associate: jest.fn(),
} as any;

import {
  oilpriceCodes,
  oilpriceGet,
  oilpricePrice,
  registerOilpriceFunctions,
} from "../../src/functions/functions";

describe("OilPrice custom functions MVP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue("test-api-key-123");
  });

  describe("OILPRICE.PRICE", () => {
    it("fetches the latest price for a commodity code", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { code: "BRENT_CRUDE_USD", price: 85.45 },
        }),
      });

      const result = await oilpricePrice("BRENT_CRUDE_USD");

      expect(result).toBe(85.45);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Token test-api-key-123",
            "X-Excel-Addin-Version": "1.0.0",
          }),
        }),
      );
    });

    it("reads the same OfficeRuntime storage key as the task pane", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { price: 80 } }),
      });

      await oilpricePrice("brent_crude_usd");

      expect(mockStorage.getItem).toHaveBeenCalledWith("oilpriceapi_key");
    });

    it("returns a worksheet error when key is missing", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#AUTH_REQUIRED: Set API key in OilPrice pane",
      );
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });

    it("maps invalid key responses to AUTH_INVALID", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#AUTH_INVALID: API key invalid or expired",
      );
    });

    it("maps rate limits to RATE_LIMITED", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#RATE_LIMITED: Limit reached. Try later",
      );
    });

    it("maps payment required responses to a quota or upgrade worksheet error", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 402,
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#UPGRADE_REQUIRED: Quota or plan limit reached",
      );
    });
  });

  describe("OILPRICE.GET", () => {
    it("returns a compact table for a supported GET endpoint", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            code: "BRENT_CRUDE_USD",
            price: 85.45,
            currency: "USD",
          },
        }),
      });

      const result = await oilpriceGet(
        "/v1/prices/latest",
        "by_code=BRENT_CRUDE_USD",
      );

      expect(result).toEqual([
        ["Field", "Value"],
        ["code", "BRENT_CRUDE_USD"],
        ["price", "85.45"],
        ["currency", "USD"],
      ]);
    });

    it("allows the supported preview endpoint catalog", async () => {
      const supportedPaths = [
        "/v1/status",
        "/v1/prices",
        "/v1/prices/latest",
        "/v1/prices/past_day",
        "/v1/prices/past_week",
        "/v1/prices/past_month",
        "/v1/prices/past_year",
        "/v1/prices/historical",
        "/v1/prices/all",
        "/v1/prices/all/health",
        "/v1/diesel-prices",
        "/v1/commodities",
        "/v1/commodities/categories",
        "/v1/commodities/BRENT_CRUDE_USD",
      ];

      for (const path of supportedPaths) {
        ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { ok: true } }),
        });

        await expect(oilpriceGet(path)).resolves.toEqual([
          ["Field", "Value"],
          ["ok", "true"],
        ]);
      }

      expect((globalThis as any).fetch).toHaveBeenCalledTimes(
        supportedPaths.length,
      );
    });

    it("supports leading question marks in query strings", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { code: "BRENT_CRUDE_USD" } }),
      });

      await oilpriceGet("/v1/prices/latest", "?by_code=BRENT_CRUDE_USD");

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD",
        expect.any(Object),
      );
    });

    it("allows normal data query keys", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { code: "BRENT_CRUDE_USD" } }),
      });

      await oilpriceGet(
        "/v1/prices/historical",
        "by_code=BRENT_CRUDE_USD&start_date=2026-05-01&end_date=2026-05-13",
      );

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/historical?by_code=BRENT_CRUDE_USD&start_date=2026-05-01&end_date=2026-05-13",
        expect.any(Object),
      );
    });

    it("renders prices hash responses as a worksheet table", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: {
              BRENT_CRUDE_USD: {
                price: 85.45,
                currency: "USD",
                timestamp: "2026-05-13T10:00:00Z",
              },
              WTI_USD: {
                price: 81.12,
                currency: "USD",
                timestamp: "2026-05-13T10:00:00Z",
              },
            },
          },
        }),
      });

      await expect(oilpriceGet("/v1/prices/all")).resolves.toEqual([
        ["Code", "price", "currency", "timestamp"],
        ["BRENT_CRUDE_USD", "85.45", "USD", "2026-05-13T10:00:00Z"],
        ["WTI_USD", "81.12", "USD", "2026-05-13T10:00:00Z"],
      ]);
    });

    it("renders prices array envelopes as worksheet table rows", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              {
                code: "BRENT_CRUDE_USD",
                price: 85.45,
                currency: "USD",
                date: "2026-05-13",
              },
              {
                code: "WTI_USD",
                price: 81.12,
                currency: "USD",
                date: "2026-05-13",
              },
            ],
          },
        }),
      });

      await expect(oilpriceGet("/v1/prices")).resolves.toEqual([
        ["code", "price", "currency", "date"],
        ["BRENT_CRUDE_USD", "85.45", "USD", "2026-05-13"],
        ["WTI_USD", "81.12", "USD", "2026-05-13"],
      ]);
    });

    it("renders historical prices array envelopes as worksheet table rows", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              {
                code: "BRENT_CRUDE_USD",
                price: 84.01,
                currency: "USD",
                date: "2026-05-12",
              },
            ],
          },
        }),
      });

      await expect(
        oilpriceGet(
          "/v1/prices/historical",
          "by_code=BRENT_CRUDE_USD&start_date=2026-05-12&end_date=2026-05-13",
        ),
      ).resolves.toEqual([
        ["code", "price", "currency", "date"],
        ["BRENT_CRUDE_USD", "84.01", "USD", "2026-05-12"],
      ]);
    });

    it("renders primitive prices hash responses as code and value rows", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: {
              BRENT_CRUDE_USD: 85.45,
              WTI_USD: 81.12,
            },
          },
        }),
      });

      await expect(oilpriceGet("/v1/prices/all")).resolves.toEqual([
        ["Code", "Value"],
        ["BRENT_CRUDE_USD", "85.45"],
        ["WTI_USD", "81.12"],
      ]);
    });

    it("rejects sensitive query keys without making a request", async () => {
      const sensitiveKeys = [
        "token",
        "api_key",
        "key",
        "authorization",
        "password",
        "secret",
        "credential",
        "x-api-key",
        "api-key",
        "api.key",
        "apiKey",
        "accessToken",
        "bearerToken",
        "token[]",
        "auth[token]",
        "credentials[password]",
        "user[api_key]",
        "token[value]",
      ];

      for (const key of sensitiveKeys) {
        await expect(
          oilpriceGet(
            "/v1/prices/latest",
            `by_code=BRENT_CRUDE_USD&${key}=should-not-send`,
          ),
        ).resolves.toEqual([
          [
            "#UNSUPPORTED_QUERY",
            "Do not pass API keys or credentials in query strings",
          ],
        ]);
      }

      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });

    it("rejects unsafe commodity path parameters without making a request", async () => {
      const result = await oilpriceGet("/v1/commodities/BRENT/extra");

      expect(result).toEqual([
        [
          "#UNSUPPORTED_ENDPOINT",
          "Use supported OilPriceAPI GET endpoints only",
        ],
      ]);
      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });

    it("rejects unsupported endpoints without making a request", async () => {
      const unsupportedPaths = [
        "/v1/users/me",
        "/v1/futures",
        "/v1/drilling",
        "/v1/account",
        "/v1/admin/users",
      ];

      for (const path of unsupportedPaths) {
        await expect(oilpriceGet(path)).resolves.toEqual([
          [
            "#UNSUPPORTED_ENDPOINT",
            "Use supported OilPriceAPI GET endpoints only",
          ],
        ]);
      }

      expect((globalThis as any).fetch).not.toHaveBeenCalled();
    });
  });

  describe("OILPRICE.CODES", () => {
    it("returns code, name, and category rows", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            commodities: [
              {
                code: "BRENT_CRUDE_USD",
                name: "Brent Crude",
                category: "crude_oil",
              },
            ],
          },
        }),
      });

      await expect(oilpriceCodes()).resolves.toEqual([
        ["Code", "Name", "Category"],
        ["BRENT_CRUDE_USD", "Brent Crude", "crude_oil"],
      ]);
    });
  });

  it("registers only the MVP function surface", () => {
    registerOilpriceFunctions();

    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledTimes(3);
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "PRICE",
      oilpricePrice,
    );
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "GET",
      oilpriceGet,
    );
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "CODES",
      oilpriceCodes,
    );
  });
});
