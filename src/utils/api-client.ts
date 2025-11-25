/**
 * OilPriceAPI Client for fetching energy commodity prices
 */

import { UserTier, UpgradeRequiredError, PLAN_FEATURES } from '../types/user-tier';

const API_BASE_URL = 'https://api.oilpriceapi.com/v1';

export interface PriceData {
  code: string;
  price: number;
  formatted: string;
  currency: string;
  timestamp: string;
}

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  UPGRADE_REQUIRED = 'UPGRADE_REQUIRED',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  UNKNOWN = 'UNKNOWN'
}

export class APIError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly recoveryAction?: string;

  constructor(
    message: string,
    public statusCode?: number,
    type?: ErrorType,
    userMessage?: string,
    recoveryAction?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.type = type || ErrorType.UNKNOWN;
    this.userMessage = userMessage || message;
    this.recoveryAction = recoveryAction;
  }

  static fromResponse(response: Response, errorData: any): APIError {
    const statusCode = response.status;
    const errorMessage = errorData.error || response.statusText;

    switch (statusCode) {
      case 401:
        return new APIError(
          `Authentication failed: ${errorMessage}`,
          401,
          ErrorType.AUTHENTICATION,
          'Your API key is invalid or expired.',
          'Please update your API key in Settings.'
        );

      case 429:
        return new APIError(
          `Rate limit exceeded: ${errorMessage}`,
          429,
          ErrorType.RATE_LIMIT,
          'You\'ve reached your API request limit.',
          'Upgrade your plan at oilpriceapi.com or wait for the limit to reset.'
        );

      case 404:
        return new APIError(
          `Resource not found: ${errorMessage}`,
          404,
          ErrorType.NOT_FOUND,
          'The requested commodity was not found.',
          'Check the commodity code and try again.'
        );

      case 500:
      case 502:
      case 503:
        return new APIError(
          `Server error: ${errorMessage}`,
          statusCode,
          ErrorType.SERVER_ERROR,
          'The API server is experiencing issues.',
          'Please try again in a few minutes.'
        );

      default:
        return new APIError(
          `HTTP ${statusCode}: ${errorMessage}`,
          statusCode,
          ErrorType.UNKNOWN,
          'An unexpected error occurred.',
          'Please try again or contact support if the problem persists.'
        );
    }
  }

  static fromNetworkError(error: Error): APIError {
    return new APIError(
      `Network error: ${error.message}`,
      undefined,
      ErrorType.NETWORK_ERROR,
      'Unable to connect to the API server.',
      'Check your internet connection and try again.',
      error
    );
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
        throw APIError.fromResponse(response, errorData);
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
      throw APIError.fromNetworkError(error);
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

  /**
   * Get user tier and permissions
   * Used to check feature access before making requests
   */
  async getUserTier(): Promise<UserTier> {
    try {
      const url = `${API_BASE_URL.replace('/v1', '')}/users/me`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user tier');
      }

      const user = await response.json();

      return {
        plan: user.plan || 'free',
        requestsUsed: user.requests_this_month || 0,
        requestsLimit: user.request_limit || 1000,
        emailConfirmed: !!user.email_confirmed_at,

        // Feature flags based on plan
        canAccessHistorical: ['exploration', 'production', 'reservoir_mastery'].includes(user.plan),
        canAccessFutures: user.reservoir_mastery === true,
        canUseWebhooks: ['production', 'reservoir_mastery'].includes(user.plan),
        canAccessDrillingIntelligence: user.reservoir_mastery === true,

        reservoirMastery: user.reservoir_mastery === true,
        webhookLimit: user.webhook_limit || 0,
        webhookEventsLimit: user.webhook_events_limit || 0
      };
    } catch (error: any) {
      throw APIError.fromNetworkError(error);
    }
  }

  /**
   * Fetch all latest prices in one API call (efficient)
   * Counts as 1 API request instead of N requests
   */
  async getAllPrices(): Promise<PriceData[]> {
    try {
      const url = `${API_BASE_URL}/prices/all`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw APIError.fromResponse(response, errorData);
      }

      const result = await response.json();

      // Map to our PriceData format
      return result.data.map((item: any) => ({
        code: item.code,
        price: item.price,
        formatted: `${item.currency} ${item.price.toFixed(2)}`,
        currency: item.currency || 'USD',
        timestamp: item.timestamp
      }));
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.fromNetworkError(error);
    }
  }

  /**
   * Fetch historical data (past year)
   * Requires Exploration tier or higher
   */
  async getPastYear(code: string): Promise<PriceData[]> {
    try {
      // Check tier BEFORE making request
      const tier = await this.getUserTier();

      if (!tier.canAccessHistorical) {
        throw new APIError(
          'Historical data requires Exploration tier or higher',
          403,
          ErrorType.UPGRADE_REQUIRED,
          'Historical data access requires a paid plan',
          'Upgrade to Exploration tier ($15/mo) to access historical data'
        );
      }

      const url = `${API_BASE_URL}/prices/past_year?by_code=${code}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Excel-Addin-Version': '1.0.0'
        }
      });

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.upgrade_required) {
          throw new APIError(
            errorData.message || 'Upgrade required',
            403,
            ErrorType.UPGRADE_REQUIRED,
            errorData.message,
            `Upgrade to ${errorData.recommended_plan || 'Exploration'} tier`
          );
        }
      }

      if (response.status === 429) {
        throw new APIError(
          'Rate limit exceeded for historical data',
          429,
          ErrorType.RATE_LIMIT,
          'You can fetch historical data for each commodity once per hour',
          'Please wait before fetching this commodity again'
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw APIError.fromResponse(response, errorData);
      }

      const result = await response.json();

      // Map historical data to PriceData format
      return result.data.map((item: any) => ({
        code: code,
        price: item.price,
        formatted: `USD ${item.price.toFixed(2)}`,
        currency: 'USD',
        timestamp: item.date || item.timestamp
      }));
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.fromNetworkError(error);
    }
  }

  /**
   * Fetch past month of historical data
   * Requires Exploration tier or higher
   */
  async getPastMonth(code: string): Promise<PriceData[]> {
    try {
      const tier = await this.getUserTier();

      if (!tier.canAccessHistorical) {
        throw new APIError(
          'Historical data requires Exploration tier or higher',
          403,
          ErrorType.UPGRADE_REQUIRED,
          'Historical data access requires a paid plan',
          'Upgrade to Exploration tier ($15/mo)'
        );
      }

      const url = `${API_BASE_URL}/prices/past_month?by_code=${code}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw APIError.fromResponse(response, errorData);
      }

      const result = await response.json();

      return result.data.map((item: any) => ({
        code: code,
        price: item.price,
        formatted: `USD ${item.price.toFixed(2)}`,
        currency: 'USD',
        timestamp: item.date || item.timestamp
      }));
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.fromNetworkError(error);
    }
  }
}
