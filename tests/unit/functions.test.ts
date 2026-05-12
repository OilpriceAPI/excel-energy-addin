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

    it("rejects unsupported endpoints without making a request", async () => {
      const result = await oilpriceGet("/v1/users/me");

      expect(result).toEqual([
        [
          "#UNSUPPORTED_ENDPOINT",
          "Use supported OilPriceAPI GET endpoints only",
        ],
      ]);
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
