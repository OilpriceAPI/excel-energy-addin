/**
 * OilPriceAPI Client for fetching energy commodity prices
 */

const API_BASE_URL = 'https://api.oilpriceapi.com/v1';

export interface PriceData {
  code: string;
  price: number;
  formatted: string;
  currency: string;
  timestamp: string;
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class OilPriceAPIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Fetch a single price for a commodity code
   */
  async getPrice(code: string): Promise<PriceData> {
    try {
      const url = `${API_BASE_URL}/prices/latest?by_code=${code}`;
      console.log('[API] Fetching:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText;

        if (response.status === 401) {
          throw new APIError(`Authentication failed: ${errorMessage}`, 401);
        }

        if (response.status === 429) {
          throw new APIError(errorMessage, 429);
        }

        throw new APIError(errorMessage, response.status);
      }

      const data = await response.json();
      return {
        code: data.data.code,
        price: data.data.price,
        formatted: data.data.formatted,
        currency: data.data.currency || 'USD',
        timestamp: data.data.created_at
      };
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`Network error: ${error.message}`, undefined, error);
    }
  }

  /**
   * Fetch multiple prices concurrently
   * Returns successful fetches, skips failures
   */
  async getMultiplePrices(codes: string[]): Promise<PriceData[]> {
    const promises = codes.map(code =>
      this.getPrice(code).catch(error => {
        console.warn(`Failed to fetch ${code}:`, error.message);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is PriceData => result !== null);
  }

  /**
   * Test if the API key is valid by making a test request
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getPrice('BRENT_CRUDE_USD');
      return true;
    } catch (error) {
      return false;
    }
  }
}
