/**
 * Custom Functions Tests
 * Following TDD - write tests first, then implement
 */

// Mock OfficeRuntime.storage
const mockStorage = {
  getItem: jest.fn().mockResolvedValue("test-api-key-123"),
  setItem: jest.fn().mockResolvedValue(undefined),
};
(globalThis as any).OfficeRuntime = { storage: mockStorage };

// Mock fetch for API responses
(globalThis as any).fetch = jest.fn();

// Mock CustomFunctions types
(globalThis as any).CustomFunctions = {
  StreamingInvocation: class {
    setResult = jest.fn();
    onCanceled: (() => void) | null = null;
  },
  associate: jest.fn(),
} as any;

import * as functions from "../../src/functions/functions";

describe("Custom Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue("test-api-key-123");
    ((globalThis as any).fetch as jest.Mock).mockClear();
  });

  describe("oilpriceLatest", () => {
    it("should fetch latest price and call setResult", async () => {
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: 85.45, code: "BRENT_CRUDE_USD" },
        }),
      });

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
      expect(mockInvocation.setResult).toHaveBeenCalledWith(85.45);

      // Clean up the interval
      if (mockInvocation.onCanceled) {
        mockInvocation.onCanceled();
      }
    });

    it("should return error for invalid code", async () => {
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      functions.oilpriceLatest("INVALID_CODE", mockInvocation);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#INVALID_CODE: Unknown commodity. Try BRENT_CRUDE_USD" as any,
      );

      // Clean up the interval
      if (mockInvocation.onCanceled) {
        mockInvocation.onCanceled();
      }
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#AUTH_REQUIRED: Set API key in Settings" as any,
      );

      // Clean up the interval
      if (mockInvocation.onCanceled) {
        mockInvocation.onCanceled();
      }
    });

    it("should set up interval for streaming updates", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { price: 85.45 } }),
      });

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      // Fast-forward 5 minutes
      await jest.advanceTimersByTimeAsync(300000);

      expect((globalThis as any).fetch).toHaveBeenCalledTimes(2); // Initial + 1 interval

      // Clean up
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should return error for invalid API key (401)", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#AUTH_INVALID: API key invalid or expired" as any,
      );

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should return error for rate limiting (429)", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      const mockResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => {
            if (header === "Retry-After") return "120";
            return null;
          },
        },
        json: async () => ({ error: "Too many requests" }),
      };

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse,
      );

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        expect.stringContaining("#RATE_LIMITED") as any,
      );

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should return error for rate limiting with X-RateLimit-Reset header", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      const now = Math.floor(Date.now() / 1000);
      const mockResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => {
            if (header === "X-RateLimit-Reset") return String(now + 180);
            return null;
          },
        },
        json: async () => ({ error: "Too many requests" }),
      };

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce(
        mockResponse,
      );

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        expect.stringContaining("#RATE_LIMITED") as any,
      );

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should return error for upgrade required (403)", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden" }),
      });

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#UPGRADE_REQUIRED: Requires higher tier. oilpriceapi.com/pricing" as any,
      );

      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe("oilprice (alias)", () => {
    it("should work as alias for oilpriceLatest", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { price: 75.3 } }),
      });

      functions.oilprice("WTI_USD", mockInvocation);

      // Wait for promises to resolve
      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(75.3);

      // Clean up the interval
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe("dieselPrice", () => {
    it("should fetch diesel price for valid state", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { state: "CA", price: 4.85 },
        }),
      });

      functions.dieselPrice("CA", mockInvocation);

      // Wait for promises to resolve
      await jest.advanceTimersByTimeAsync(0);

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/diesel-prices/states/CA",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
      expect(mockInvocation.setResult).toHaveBeenCalledWith(4.85);

      // Clean up the interval
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should return error for invalid state", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "State not found" }),
      });

      functions.dieselPrice("XX", mockInvocation);

      // Wait for promises to resolve
      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#INVALID_CODE: Unknown commodity. Try BRENT_CRUDE_USD" as any,
      );

      // Clean up the interval
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe("oilpriceHistory", () => {
    it("should return 2D array of historical data", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              { date: "2025-01-01", price: 80.0 },
              { date: "2025-01-02", price: 81.5 },
              { date: "2025-01-03", price: 82.0 },
            ],
          },
        }),
      });

      const result = await functions.oilpriceHistory(
        "WTI_USD",
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toEqual([
        ["Date", "Price"],
        ["2025-01-01", "80.00"],
        ["2025-01-02", "81.50"],
        ["2025-01-03", "82.00"],
      ]);
    });

    it("should return error for invalid date range", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid date range" }),
      });

      const result = await functions.oilpriceHistory(
        "WTI_USD",
        "2025-01-31",
        "2025-01-01",
      );

      expect(result).toEqual([["#ERROR"], ["HTTP 400"]]);
    });
  });

  describe("oilpriceConvert", () => {
    it("should convert price between units", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: 85.0, code: "BRENT_CRUDE_USD" },
        }),
      });

      const result = await functions.oilpriceConvert(
        "BRENT_CRUDE_USD",
        "barrel",
        "MBtu",
      );

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should return error for unsupported conversion", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: -1.0 }, // Negative price will trigger error
        }),
      });

      const result = await functions.oilpriceConvert(
        "BRENT_CRUDE_USD",
        "barrel",
        "MBtu",
      );

      expect(typeof result).toBe("string");
      expect(result).toBe("#ERROR: Conversion failed");
    });
  });

  describe("oilpriceAvg", () => {
    it("should calculate average over specified days", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              { date: "2025-01-01", price: 80.0 },
              { date: "2025-01-02", price: 82.0 },
              { date: "2025-01-03", price: 84.0 },
            ],
          },
        }),
      });

      const result = await functions.oilpriceAvg("BRENT_CRUDE_USD", 30);

      expect(result).toBe(82.0); // (80 + 82 + 84) / 3
    });

    it("should return error when no data available", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { prices: [] },
        }),
      });

      const result = await functions.oilpriceAvg("INVALID_CODE", 30);

      expect(typeof result).toBe("string");
      expect(result).toBe("#NO_DATA: No data available for INVALID_CODE");
    });
  });

  describe("oilpriceMin", () => {
    it("should return minimum price across all commodities when no code provided", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { code: "BRENT_CRUDE_USD", price: 85.0 },
            { code: "WTI_USD", price: 75.0 },
            { code: "NATURAL_GAS_USD", price: 3.5 },
          ],
        }),
      });

      const result = await functions.oilpriceMin();

      expect(result).toBe(3.5);
    });

    it("should return minimum for specific commodity", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              { date: "2025-01-01", price: 80.0 },
              { date: "2025-01-02", price: 75.0 },
              { date: "2025-01-03", price: 82.0 },
            ],
          },
        }),
      });

      const result = await functions.oilpriceMin("BRENT_CRUDE_USD");

      expect(result).toBe(75.0);
    });
  });

  describe("oilpriceMax", () => {
    it("should return maximum price across all commodities when no code provided", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { code: "BRENT_CRUDE_USD", price: 85.0 },
            { code: "WTI_USD", price: 75.0 },
            { code: "NATURAL_GAS_USD", price: 3.5 },
          ],
        }),
      });

      const result = await functions.oilpriceMax();

      expect(result).toBe(85.0);
    });

    it("should return maximum for specific commodity", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            prices: [
              { date: "2025-01-01", price: 80.0 },
              { date: "2025-01-02", price: 88.0 },
              { date: "2025-01-03", price: 82.0 },
            ],
          },
        }),
      });

      const result = await functions.oilpriceMax("BRENT_CRUDE_USD");

      expect(result).toBe(88.0);
    });
  });

  describe("oilpriceCodes", () => {
    it("should return 2D array of commodities", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            commodities: [
              { code: "BRENT_CRUDE_USD", name: "Brent Crude", category: "Oil" },
              { code: "WTI_USD", name: "WTI Crude", category: "Oil" },
            ],
          },
        }),
      });

      const result = await functions.oilpriceCodes();

      expect(result).toEqual([
        ["Code", "Name", "Category"],
        ["BRENT_CRUDE_USD", "Brent Crude", "Oil"],
        ["WTI_USD", "WTI Crude", "Oil"],
      ]);
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.oilpriceCodes();

      expect(result).toEqual([["#AUTH_REQUIRED"], ["Set API key in Settings"]]);
    });

    it("should handle error response", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const result = await functions.oilpriceCodes();

      expect(result).toEqual([
        ["#SERVER_ERROR"],
        ["API temporarily unavailable. Retry in 1m"],
      ]);
    });
  });

  describe("futuresPrice", () => {
    it("should return futures price", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: 88.5 },
        }),
      });

      const result = await functions.futuresPrice("ice-brent");

      expect(result).toBe(88.5);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/futures/ice-brent",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
    });

    it("should return error for invalid contract", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await functions.futuresPrice("invalid-contract");

      expect(result).toBe(
        "#INVALID_CODE: Unknown commodity. Try BRENT_CRUDE_USD",
      );
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.futuresPrice("ice-brent");

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });
  });

  describe("futuresCurve", () => {
    it("should return 2D array of futures curve", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            curve: [
              { month: "2026-03", price: 88.5 },
              { month: "2026-04", price: 89.2 },
            ],
          },
        }),
      });

      const result = await functions.futuresCurve("ice-brent");

      expect(result).toEqual([
        ["Month", "Price"],
        ["2026-03", "88.50"],
        ["2026-04", "89.20"],
      ]);
    });

    it("should return error for invalid contract", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await functions.futuresCurve("invalid");

      expect(result).toEqual([
        ["#INVALID_CODE"],
        ["Unknown contract. Try ice-brent"],
      ]);
    });

    it("should return error when no data", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { curve: [] },
        }),
      });

      const result = await functions.futuresCurve("ice-brent");

      expect(result).toEqual([["#NO_DATA"], ["No curve data for ice-brent"]]);
    });
  });

  describe("storageCushing", () => {
    it("should return Cushing storage level", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { inventory: 45.2 },
        }),
      });

      const result = await functions.storageCushing();

      expect(result).toBe(45.2);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/storage/cushing",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.storageCushing();

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });

    it("should handle network error", async () => {
      ((globalThis as any).fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await functions.storageCushing();

      expect(result).toBe("#NETWORK_ERROR: Cannot reach API. Check connection");
    });
  });

  describe("storageSpr", () => {
    it("should return SPR storage level", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { inventory: 380.5 },
        }),
      });

      const result = await functions.storageSpr();

      expect(result).toBe(380.5);
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.storageSpr();

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });
  });

  describe("rigCount", () => {
    it("should return oil rig count", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { oil: 520, gas: 130, total: 650 },
        }),
      });

      const result = await functions.rigCount("oil");

      expect(result).toBe(520);
    });

    it("should return gas rig count", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { oil: 520, gas: 130, total: 650 },
        }),
      });

      const result = await functions.rigCount("gas");

      expect(result).toBe(130);
    });

    it("should return total rig count", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { oil: 520, gas: 130, total: 650 },
        }),
      });

      const result = await functions.rigCount("total");

      expect(result).toBe(650);
    });

    it("should return error for invalid type", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { oil: 520, gas: 130, total: 650 },
        }),
      });

      const result = await functions.rigCount("invalid");

      expect(result).toBe("#INVALID_CODE: Use 'oil', 'gas', or 'total'");
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.rigCount("oil");

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });
  });

  describe("forecastPrice", () => {
    it("should return forecast price", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: 92.5 },
        }),
      });

      const result = await functions.forecastPrice("WTI_USD", "2026-03");

      expect(result).toBe(92.5);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/forecasts/monthly/2026-03?commodity=WTI_USD",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
    });

    it("should return error for invalid period", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await functions.forecastPrice("WTI_USD", "invalid");

      expect(result).toBe("#INVALID_CODE: Invalid period. Use YYYY-MM");
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.forecastPrice("WTI_USD", "2026-03");

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });
  });

  describe("oilpriceStats", () => {
    it("should return 2D array of statistics", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            mean: 85.5,
            median: 86.0,
            std_dev: 2.3,
            min: 80.0,
            max: 90.0,
          },
        }),
      });

      const result = await functions.oilpriceStats("BRENT_CRUDE_USD", 30);

      expect(result).toEqual([
        ["Metric", "Value"],
        ["Mean", "85.50"],
        ["Median", "86.00"],
        ["StdDev", "2.30"],
        ["Min", "80.00"],
        ["Max", "90.00"],
      ]);
    });

    it("should return error for invalid commodity", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await functions.oilpriceStats("INVALID", 30);

      expect(result).toEqual([
        ["#INVALID_CODE"],
        ["Unknown commodity. Try BRENT_CRUDE_USD"],
      ]);
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.oilpriceStats("BRENT_CRUDE_USD", 30);

      expect(result).toEqual([["#AUTH_REQUIRED"], ["Set API key in Settings"]]);
    });
  });

  describe("oilpriceSpread", () => {
    it("should return spread between two commodities", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { spread: 3.5 },
        }),
      });

      const result = await functions.oilpriceSpread(
        "BRENT_CRUDE_USD",
        "WTI_USD",
      );

      expect(result).toBe(3.5);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/analytics/spread?commodity1=BRENT_CRUDE_USD&commodity2=WTI_USD",
        expect.objectContaining({
          headers: { Authorization: "Token test-api-key-123" },
        }),
      );
    });

    it("should return error for invalid commodity", async () => {
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await functions.oilpriceSpread("INVALID1", "INVALID2");

      expect(result).toBe(
        "#INVALID_CODE: Unknown commodity. Try BRENT_CRUDE_USD",
      );
    });

    it("should return error when no API key", async () => {
      mockStorage.getItem.mockResolvedValueOnce(null);

      const result = await functions.oilpriceSpread(
        "BRENT_CRUDE_USD",
        "WTI_USD",
      );

      expect(result).toBe("#AUTH_REQUIRED: Set API key in Settings");
    });
  });

  describe("oilpriceDemo", () => {
    it("should return 2D array of demo commodities", async () => {
      const result = await functions.oilpriceDemo();

      expect(result).toEqual([
        ["Demo Commodities (no API key needed)"],
        ["BRENT_CRUDE_USD"],
        ["WTI_USD"],
        ["NATURAL_GAS_USD"],
        ["GOLD_USD"],
        ["EUR_USD"],
        ["GBP_USD"],
        ["HEATING_OIL_USD"],
        ["GASOLINE_USD"],
        ["DIESEL_USD"],
      ]);
    });
  });

  describe("demoRequest", () => {
    it("should make unauthenticated demo API request", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { price: 85.5, code: "BRENT_CRUDE_USD" },
        }),
      });

      // We need to test this indirectly through oilpriceLatest
      mockStorage.getItem.mockResolvedValueOnce(null);

      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      functions.oilpriceLatest("BRENT_CRUDE_USD", mockInvocation);

      // Wait for promises to resolve
      await jest.advanceTimersByTimeAsync(0);

      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/demo/prices/BRENT_CRUDE_USD",
      );
      expect(mockInvocation.setResult).toHaveBeenCalledWith(85.5);

      // Clean up the interval
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it("should fall back to auth error for non-demo commodity without API key", async () => {
      jest.useFakeTimers();
      let cancelFn: (() => void) | null = null;
      mockStorage.getItem.mockResolvedValueOnce(null);

      const mockInvocation = {
        setResult: jest.fn(),
        set onCanceled(fn: (() => void) | null) {
          cancelFn = fn;
        },
        get onCanceled() {
          return cancelFn;
        },
      } as any;

      functions.oilpriceLatest("SOME_OTHER_COMMODITY", mockInvocation);

      // Wait for promises to resolve
      await jest.advanceTimersByTimeAsync(0);

      expect(mockInvocation.setResult).toHaveBeenCalledWith(
        "#AUTH_REQUIRED: Set API key in Settings" as any,
      );

      // Clean up the interval
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });
});
