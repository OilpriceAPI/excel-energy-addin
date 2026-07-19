const mockStorage = {
  getItem: jest.fn().mockResolvedValue("test-api-key-123"),
  setItem: jest.fn().mockResolvedValue(undefined),
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
  oilpricePriceInfo,
  oilpricePriceStatus,
  oilpricePriceUnit,
  registerOilpriceFunctions,
} from "../../src/functions/functions";

describe("OilPrice custom functions MVP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue("test-api-key-123");
    mockStorage.setItem.mockResolvedValue(undefined);
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
          headers: {
            Authorization: "Token test-api-key-123",
            "Content-Type": "application/json",
          },
          signal: expect.any(Object),
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

    it("maps an entitlement-locked commodity to an upgrade worksheet error", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "commodity_locked" }),
      });

      await expect(oilpricePrice("LOCKED_COMMODITY")).resolves.toBe(
        "#UPGRADE_REQUIRED: Plan does not include this endpoint",
      );
    });

    it("returns NO_DATA for an empty successful response", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ data: null }),
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#NO_DATA: No data returned",
      );
    });

    it("returns INVALID_RESPONSE when a successful payload has a non-numeric price", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          data: { code: "BRENT_CRUDE_USD", price: "not-a-number" },
        }),
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#INVALID_RESPONSE: API returned a malformed price",
      );
    });

    it("surfaces a successful error payload instead of treating it as no data", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          data: {
            error: "invalid_code",
            message: "Code not found. Did you mean BRENT_CRUDE_USD?",
          },
        }),
      });

      await expect(oilpricePrice("BRENT")).resolves.toBe(
        "#INVALID_CODE: Code not found. Did you mean BRENT_CRUDE_USD?",
      );
    });

    it("returns TIMEOUT and records no key when the request is aborted", async () => {
      jest.useFakeTimers();
      ((globalThis as any).fetch as jest.Mock).mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );

      const resultPromise = oilpricePrice("BRENT_CRUDE_USD");
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(15_000);

      await expect(resultPromise).resolves.toBe(
        "#TIMEOUT: OilPriceAPI did not respond in time",
      );
      const [, rawDiagnostic] =
        mockStorage.setItem.mock.calls[
          mockStorage.setItem.mock.calls.length - 1
        ];
      expect(rawDiagnostic).toContain('"code":"TIMEOUT"');
      expect(rawDiagnostic).not.toContain("test-api-key-123");
      jest.useRealTimers();
    });

    it("keeps the timeout active while reading a successful response body", async () => {
      jest.useFakeTimers();
      ((globalThis as any).fetch as jest.Mock).mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: () =>
              new Promise((_resolve, reject) => {
                options.signal?.addEventListener("abort", () =>
                  reject(new DOMException("Aborted", "AbortError")),
                );
              }),
          }),
      );

      const resultPromise = oilpricePrice("BRENT_CRUDE_USD");
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(15_000);

      await expect(resultPromise).resolves.toBe(
        "#TIMEOUT: OilPriceAPI did not respond in time",
      );
      jest.useRealTimers();
    });

    it("classifies an aborted error-body read as TIMEOUT", async () => {
      jest.useFakeTimers();
      ((globalThis as any).fetch as jest.Mock).mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          Promise.resolve({
            ok: false,
            status: 403,
            headers: new Headers(),
            json: () =>
              new Promise((_resolve, reject) => {
                options.signal?.addEventListener("abort", () =>
                  reject(new DOMException("Aborted", "AbortError")),
                );
              }),
          }),
      );

      const resultPromise = oilpricePrice("LOCKED_COMMODITY");
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(15_000);

      await expect(resultPromise).resolves.toBe(
        "#TIMEOUT: OilPriceAPI did not respond in time",
      );
      jest.useRealTimers();
    });

    it("distinguishes browser/CORS failures from authentication failures", async () => {
      ((globalThis as any).fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError("Failed to fetch"),
      );

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(
        "#NETWORK_OR_CORS: The browser or CORS policy blocked the API request",
      );

      const [, rawDiagnostic] =
        mockStorage.setItem.mock.calls[
          mockStorage.setItem.mock.calls.length - 1
        ];
      expect(JSON.parse(rawDiagnostic)).toEqual(
        expect.objectContaining({
          schemaVersion: 1,
          source: "custom-function",
          result: "network-or-cors",
          code: "NETWORK_OR_CORS",
          endpoint: "/v1/prices/latest",
        }),
      );
      expect(rawDiagnostic).not.toContain("test-api-key-123");
      expect(rawDiagnostic).not.toContain("BRENT_CRUDE_USD");
    });

    it("records successful formula diagnostics without the API key", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "x-request-id": "request-123" }),
        json: async () => ({ data: { price: 80 } }),
      });

      await expect(oilpricePrice("BRENT_CRUDE_USD")).resolves.toBe(80);

      const [storageKey, rawDiagnostic] =
        mockStorage.setItem.mock.calls[
          mockStorage.setItem.mock.calls.length - 1
        ];
      expect(storageKey).toBe("opa_excel_last_runtime_diagnostic");
      expect(JSON.parse(rawDiagnostic)).toEqual(
        expect.objectContaining({
          result: "success",
          code: "OK",
          httpStatus: 200,
          requestId: "request-123",
        }),
      );
      expect(rawDiagnostic).not.toContain("test-api-key-123");
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
        ["price", 85.45],
        ["currency", "USD"],
      ]);
    });

    // NOTE(#58): this previously asserted that a *fabricated* `{data:{ok:true}}`
    // body rendered — a synthetic mock that let real-shape breakage ship. It now
    // asserts only that each supported path is ACCEPTED and fetched at the right
    // URL (catalog membership). Real-shape RENDERING is verified against captured
    // fixtures in functions-realshape.test.ts.
    it("accepts every supported preview endpoint (incl. futures) and calls the API", async () => {
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
        "/v1/futures/ice-brent",
        "/v1/futures/ice-wti",
        "/v1/futures/ice-gasoil",
        "/v1/futures/natural-gas",
        "/v1/futures/eua-carbon",
        "/v1/futures/ice-brent/historical",
        "/v1/futures/ice-brent/ohlc",
        "/v1/futures/ice-brent/intraday",
        "/v1/futures/ice-brent/spreads",
        "/v1/futures/ice-brent/curve",
        "/v1/futures/ice-brent/spread-history",
      ];

      for (const path of supportedPaths) {
        ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} }),
        });

        await oilpriceGet(path);

        expect((globalThis as any).fetch).toHaveBeenLastCalledWith(
          `https://api.oilpriceapi.com${path}`,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Token test-api-key-123",
            }),
          }),
        );
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
        ["BRENT_CRUDE_USD", 85.45, "USD", "2026-05-13T10:00:00Z"],
        ["WTI_USD", 81.12, "USD", "2026-05-13T10:00:00Z"],
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
        ["BRENT_CRUDE_USD", 85.45, "USD", "2026-05-13"],
        ["WTI_USD", 81.12, "USD", "2026-05-13"],
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
        ["BRENT_CRUDE_USD", 84.01, "USD", "2026-05-12"],
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
        ["BRENT_CRUDE_USD", 85.45],
        ["WTI_USD", 81.12],
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

  it("registers the public function surface (base + freshness/units helpers)", () => {
    registerOilpriceFunctions();

    // 3 base functions + STATUS (#55) + UNIT/INFO (#56). The three helpers are
    // registered as bare leaves (OILPRICE.STATUS/UNIT/INFO) — NOT PRICE.* —
    // because Namespace is OILPRICE and PRICE is already a callable function;
    // making PRICE both a function and a namespace parent breaks in Excel (P0-2).
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledTimes(
      6,
    );
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
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "STATUS",
      oilpricePriceStatus,
    );
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "UNIT",
      oilpricePriceUnit,
    );
    expect((globalThis as any).CustomFunctions.associate).toHaveBeenCalledWith(
      "INFO",
      oilpricePriceInfo,
    );
  });
});
