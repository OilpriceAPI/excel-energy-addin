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

  describe("getPrice - server errors", () => {
    test("throws APIError for 500 Internal Server Error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Internal server error" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Server error: Internal server error",
      );
    });

    test("throws APIError for 502 Bad Gateway", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => ({ error: "Bad gateway" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Server error: Bad gateway",
      );
    });

    test("throws APIError for 503 Service Unavailable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({ error: "Service unavailable" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "Server error: Service unavailable",
      );
    });

    test("throws APIError for unknown status code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        json: async () => ({ error: "Teapot error" }),
      } as Response);

      await expect(client.getPrice("BRENT_CRUDE_USD")).rejects.toThrow(
        "HTTP 418: Teapot error",
      );
    });
  });

  describe("getUserTier", () => {
    test("returns user tier for free plan", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "free",
          requests_this_month: 500,
          request_limit: 1000,
          email_confirmed_at: "2025-01-01T00:00:00Z",
        }),
      } as Response);

      const result = await client.getUserTier();

      expect(result.plan).toBe("free");
      expect(result.requestsUsed).toBe(500);
      expect(result.requestsLimit).toBe(1000);
      expect(result.emailConfirmed).toBe(true);
      expect(result.canAccessHistorical).toBe(false);
      expect(result.canAccessFutures).toBe(false);
      expect(result.canUseWebhooks).toBe(false);
    });

    test("returns user tier for exploration plan with historical access", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "exploration",
          requests_this_month: 2000,
          request_limit: 10000,
          email_confirmed: true,
        }),
      } as Response);

      const result = await client.getUserTier();

      expect(result.plan).toBe("exploration");
      expect(result.canAccessHistorical).toBe(true);
      expect(result.canUseWebhooks).toBe(false);
    });

    test("returns user tier for production plan with webhooks", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "production",
          requests_this_month: 5000,
          request_limit: 50000,
          webhook_limit: 10,
          webhook_events_limit: 1000,
        }),
      } as Response);

      const result = await client.getUserTier();

      expect(result.plan).toBe("production");
      expect(result.canAccessHistorical).toBe(true);
      expect(result.canUseWebhooks).toBe(true);
      expect(result.webhookLimit).toBe(10);
      expect(result.webhookEventsLimit).toBe(1000);
    });

    test("returns user tier for reservoir_mastery with all features", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "reservoir_mastery",
          reservoir_mastery: true,
          requests_this_month: 10000,
          request_limit: 100000,
        }),
      } as Response);

      const result = await client.getUserTier();

      expect(result.plan).toBe("reservoir_mastery");
      expect(result.canAccessHistorical).toBe(true);
      expect(result.canAccessFutures).toBe(true);
      expect(result.canUseWebhooks).toBe(true);
      expect(result.canAccessDrillingIntelligence).toBe(true);
      expect(result.reservoirMastery).toBe(true);
    });

    test("returns admin features for admin user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          plan: "free",
          admin: true,
        }),
      } as Response);

      const result = await client.getUserTier();

      expect(result.canAccessHistorical).toBe(true);
      expect(result.canAccessFutures).toBe(true);
      expect(result.canUseWebhooks).toBe(true);
    });

    test("throws APIError for failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      } as Response);

      await expect(client.getUserTier()).rejects.toThrow("Network error");
    });

    test("uses default values when fields missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const result = await client.getUserTier();

      expect(result.plan).toBe("free");
      expect(result.requestsUsed).toBe(0);
      expect(result.requestsLimit).toBe(1000);
      expect(result.webhookLimit).toBe(0);
    });
  });

  describe("getAllPrices", () => {
    test("fetches all prices successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              code: "BRENT_CRUDE_USD",
              price: 85.5,
              currency: "USD",
              timestamp: "2025-10-07T12:00:00Z",
            },
            {
              code: "WTI_USD",
              price: 82.0,
              currency: "USD",
              timestamp: "2025-10-07T12:00:00Z",
            },
          ],
        }),
      } as Response);

      const result = await client.getAllPrices();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("BRENT_CRUDE_USD");
      expect(result[0].price).toBe(85.5);
      expect(result[0].formatted).toBe("USD 85.50");
      expect(result[1].code).toBe("WTI_USD");
    });

    test("throws APIError for failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      } as Response);

      await expect(client.getAllPrices()).rejects.toThrow("Server error");
    });

    test("throws APIError for network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(client.getAllPrices()).rejects.toThrow("Network error");
    });

    test("uses default currency when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              code: "BRENT_CRUDE_USD",
              price: 85.5,
              timestamp: "2025-10-07T12:00:00Z",
            },
          ],
        }),
      } as Response);

      const result = await client.getAllPrices();

      expect(result[0].currency).toBe("USD");
    });
  });

  describe("getPastYear", () => {
    test("fetches past year data for authorized user", async () => {
      // First call: getUserTier
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      // Second call: getPastYear
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { price: 80.0, date: "2025-01-01" },
            { price: 85.0, date: "2025-06-01" },
          ],
        }),
      } as Response);

      const result = await client.getPastYear("BRENT_CRUDE_USD");

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("BRENT_CRUDE_USD");
      expect(result[0].price).toBe(80.0);
      expect(result[0].formatted).toBe("USD 80.00");
    });

    test("throws upgrade error for free tier user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "free" }),
      } as Response);

      await expect(client.getPastYear("BRENT_CRUDE_USD")).rejects.toThrow(
        "Historical data requires Exploration tier or higher",
      );
    });

    test("throws upgrade error for 403 with upgrade_required", async () => {
      // First call: getUserTier (authorized)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      // Second call: 403 with upgrade required
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          upgrade_required: true,
          message: "Upgrade to access this feature",
          recommended_plan: "Production",
        }),
      } as Response);

      await expect(client.getPastYear("BRENT_CRUDE_USD")).rejects.toThrow(
        "Upgrade to access this feature",
      );
    });

    test("throws rate limit error for 429", async () => {
      // First call: getUserTier
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      // Second call: 429 rate limit
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response);

      await expect(client.getPastYear("BRENT_CRUDE_USD")).rejects.toThrow(
        "Rate limit exceeded for historical data",
      );
    });

    test("handles timestamp field when date not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ price: 80.0, timestamp: "2025-01-01T12:00:00Z" }],
        }),
      } as Response);

      const result = await client.getPastYear("BRENT_CRUDE_USD");

      expect(result[0].timestamp).toBe("2025-01-01T12:00:00Z");
    });

    test("throws APIError for other errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Commodity not found" }),
      } as Response);

      await expect(client.getPastYear("INVALID_CODE")).rejects.toThrow(
        "Resource not found",
      );
    });

    test("throws network error for connection issues", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(client.getPastYear("BRENT_CRUDE_USD")).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getPastMonth", () => {
    test("fetches past month data for authorized user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { price: 84.0, date: "2025-10-01" },
            { price: 85.0, date: "2025-10-15" },
          ],
        }),
      } as Response);

      const result = await client.getPastMonth("BRENT_CRUDE_USD");

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(84.0);
      expect(result[0].currency).toBe("USD");
    });

    test("throws upgrade error for free tier user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "free" }),
      } as Response);

      await expect(client.getPastMonth("BRENT_CRUDE_USD")).rejects.toThrow(
        "Historical data requires Exploration tier or higher",
      );
    });

    test("throws APIError for failed request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      } as Response);

      await expect(client.getPastMonth("BRENT_CRUDE_USD")).rejects.toThrow(
        "Server error",
      );
    });

    test("throws network error for connection issues", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "exploration" }),
      } as Response);

      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      await expect(client.getPastMonth("BRENT_CRUDE_USD")).rejects.toThrow(
        "Network error",
      );
    });

    test("handles timestamp field when date not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ plan: "production" }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ price: 85.0, timestamp: "2025-10-15T10:00:00Z" }],
        }),
      } as Response);

      const result = await client.getPastMonth("BRENT_CRUDE_USD");

      expect(result[0].timestamp).toBe("2025-10-15T10:00:00Z");
    });
  });

  describe("getDataConnectorPrices", () => {
    test("fetches data connector prices successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            prices: [
              {
                price: 567.5,
                currency: "USD",
                fuel_type: "VLSFO",
                port: "SINGAPORE",
                region: "APAC",
                unit: "MT",
                source: "shipandbunker",
                timestamp: "2025-10-07T12:00:00Z",
              },
            ],
          },
        }),
      } as Response);

      const result = await client.getDataConnectorPrices();

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(567.5);
      expect(result[0].fuel_type).toBe("VLSFO");
      expect(result[0].port).toBe("SINGAPORE");
      expect(result[0].source).toBe("shipandbunker");
    });

    test("fetches with fuel type filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices({ fuelType: "MGO" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("fuel_type=MGO"),
        expect.any(Object),
      );
    });

    test("fetches with port filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices({ port: "ROTTERDAM" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("port=ROTTERDAM"),
        expect.any(Object),
      );
    });

    test("fetches with region filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices({ region: "EMEA" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("region=EMEA"),
        expect.any(Object),
      );
    });

    test("fetches with since filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices({ since: "2025-10-01T00:00:00Z" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("since=2025-10-01T00%3A00%3A00Z"),
        expect.any(Object),
      );
    });

    test("fetches with multiple filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices({
        fuelType: "VLSFO",
        port: "SINGAPORE",
        region: "APAC",
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("fuel_type=VLSFO");
      expect(calledUrl).toContain("port=SINGAPORE");
      expect(calledUrl).toContain("region=APAC");
    });

    test("throws upgrade error for 403", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Data Connector not enabled" }),
      } as Response);

      await expect(client.getDataConnectorPrices()).rejects.toThrow(
        "Data Connector not enabled",
      );
    });

    test("throws APIError for other errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      } as Response);

      await expect(client.getDataConnectorPrices()).rejects.toThrow(
        "Server error",
      );
    });

    test("throws network error for connection issues", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(client.getDataConnectorPrices()).rejects.toThrow(
        "Network error",
      );
    });

    test("returns empty array when data.prices is undefined", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      } as Response);

      const result = await client.getDataConnectorPrices();

      expect(result).toEqual([]);
    });

    test("builds URL without query string when no options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { prices: [] } }),
      } as Response);

      await client.getDataConnectorPrices();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.oilpriceapi.com/v1/prices/data-connector",
        expect.any(Object),
      );
    });
  });
});
