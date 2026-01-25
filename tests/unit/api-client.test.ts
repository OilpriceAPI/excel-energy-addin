import {
  OilPriceAPIClient,
  PriceData,
  APIError,
} from "../../src/utils/api-client";

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(globalThis as any).fetch = mockFetch;

describe("OilPriceAPIClient", () => {
  let client: OilPriceAPIClient;
  const mockApiKey = "test-api-key-12345";

  beforeEach(() => {
    client = new OilPriceAPIClient(mockApiKey);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    test("throws error if API key is empty", () => {
      expect(() => new OilPriceAPIClient("")).toThrow("API key is required");
    });

    test("creates client with valid API key", () => {
      expect(client).toBeInstanceOf(OilPriceAPIClient);
    });
  });

  describe("getPrice", () => {
    test("fetches Brent crude price successfully", async () => {
      const mockResponse = {
        status: "success",
        data: {
          price: 85.5,
          formatted: "$85.50",
          code: "BRENT_CRUDE_USD",
          created_at: "2025-10-07T12:00:00Z",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.getPrice("BRENT_CRUDE_USD");

      expect(result).toEqual({
        code: "BRENT_CRUDE_USD",
        price: 85.5,
        formatted: "$85.50",
        currency: "USD",
        timestamp: "2025-10-07T12:00:00Z",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD",
        {
          headers: {
            Authorization: `Token ${mockApiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
    });

    test("throws APIError for 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Invalid API key" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Authentication failed: Invalid API key",
      );
    });

    test("throws APIError for 404 Not Found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Price not found" }),
      } as Response);

      await expect(client.getPrice("INVALID_CODE")).rejects.toThrow(
        "Price not found",
      );
    });

    test("throws APIError for network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Network error: Network error",
      );
    });

    test("throws APIError for 429 Rate Limit", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({ error: "Rate limit exceeded" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });

  describe("getMultiplePrices", () => {
    test("fetches multiple prices successfully", async () => {
      const mockBrentResponse = {
        status: "success",
        data: {
          price: 85.5,
          formatted: "$85.50",
          code: "BRENT_CRUDE_USD",
          created_at: "2025-10-07T12:00:00Z",
        },
      };

      const mockWTIResponse = {
        status: "success",
        data: {
          price: 82.0,
          formatted: "$82.00",
          code: "WTI_CRUDE_USD",
          created_at: "2025-10-07T12:00:00Z",
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockBrentResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockWTIResponse,
        } as Response);

      const result = await client.getMultiplePrices([
        "BRENT_CRUDE_USD",
        "WTI_CRUDE_USD",
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("BRENT_CRUDE_USD");
      expect(result[0].price).toBe(85.5);
      expect(result[1].code).toBe("WTI_CRUDE_USD");
      expect(result[1].price).toBe(82.0);
    });

    test("returns partial results if some requests fail", async () => {
      const mockBrentResponse = {
        status: "success",
        data: {
          price: 85.5,
          formatted: "$85.50",
          code: "BRENT_CRUDE_USD",
          created_at: "2025-10-07T12:00:00Z",
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockBrentResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ error: "Price not found" }),
        } as Response);

      const result = await client.getMultiplePrices([
        "BRENT_CRUDE_USD",
        "INVALID_CODE",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("BRENT_CRUDE_USD");
    });
  });

  describe("testConnection", () => {
    test("returns true for successful connection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          data: {
            price: 85.5,
            code: "BRENT_CRUDE_USD",
            formatted: "$85.50",
            created_at: "2025-10-07T12:00:00Z",
          },
        }),
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    test("returns false for failed connection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    test("returns false for network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});
