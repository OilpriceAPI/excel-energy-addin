export interface ClassifiedApiError {
  label: string;
  code: string;
  message: string;
  apiMessage?: string;
}

const MAX_ERROR_BODY_CHARS = 16_384;
const MAX_ERROR_MESSAGE_CHARS = 320;
const MAX_RECOVERY_URL_CHARS = 512;
const SUPPORT_URL = "https://www.oilpriceapi.com/support";
const PRICING_URL = "https://www.oilpriceapi.com/pricing";
const CONFIRMATION_URL =
  "https://www.oilpriceapi.com/auth/resend-confirmation";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const valueWithoutControls = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!valueWithoutControls) return undefined;
  return valueWithoutControls.slice(0, maxLength);
}

function canonicalErrorObject(payload: unknown): JsonObject | null {
  if (!isObject(payload)) return null;
  if (isObject(payload.error)) return payload.error;
  if (isObject(payload.data)) {
    return isObject(payload.data.error) ? payload.data.error : payload.data;
  }
  return payload;
}

function fieldFrom(
  primary: JsonObject | null,
  root: unknown,
  field: string,
): unknown {
  if (primary && primary[field] !== undefined) return primary[field];
  return isObject(root) ? root[field] : undefined;
}

function trustedOilPriceUrl(value: unknown, fallback: string): string {
  const candidate = boundedString(value, MAX_RECOVERY_URL_CHARS);
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    const trustedHost =
      parsed.hostname === "oilpriceapi.com" ||
      parsed.hostname.endsWith(".oilpriceapi.com");
    if (
      parsed.protocol !== "https:" ||
      !trustedHost ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== "443")
    ) {
      return fallback;
    }
    return candidate;
  } catch {
    return fallback;
  }
}

async function readBoundedErrorPayload(response: Response): Promise<unknown> {
  try {
    const contentLength = Number(response.headers?.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_ERROR_BODY_CHARS) {
      return null;
    }

    if (response.body && typeof response.body.getReader === "function") {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let byteLength = 0;
      let text = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        byteLength += chunk.value.byteLength;
        if (byteLength > MAX_ERROR_BODY_CHARS) {
          await reader.cancel();
          return null;
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
      if (!text || text.length > MAX_ERROR_BODY_CHARS) return null;
      return JSON.parse(text);
    }

    if (typeof response.text === "function") {
      const text = await response.text();
      if (!text || text.length > MAX_ERROR_BODY_CHARS) return null;
      return JSON.parse(text);
    }

    // Unit fixtures and older Office WebView shims may expose json() without
    // text(). The serialized bound keeps the same fail-closed contract.
    if (typeof response.json === "function") {
      const payload = await response.json();
      return JSON.stringify(payload).length <= MAX_ERROR_BODY_CHARS
        ? payload
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

function headerValue(response: Response, name: string): string | null {
  try {
    return response.headers?.get(name) || null;
  } catch {
    return null;
  }
}

function retryDelaySeconds(response: Response): number | null {
  const retryAfter = headerValue(response, "retry-after");
  if (retryAfter) {
    const numeric = Number(retryAfter);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return Math.min(Math.max(Math.ceil(numeric), 1), 604_800);
    }
    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt) && retryAt > Date.now()) {
      return Math.min(Math.ceil((retryAt - Date.now()) / 1000), 604_800);
    }
  }

  const resetAt = Number(headerValue(response, "x-ratelimit-reset"));
  if (Number.isFinite(resetAt) && resetAt > Date.now() / 1000) {
    return Math.min(Math.ceil(resetAt - Date.now() / 1000), 604_800);
  }
  return null;
}

function retryMessage(response: Response): string {
  const seconds = retryDelaySeconds(response);
  if (seconds === null) return "Wait briefly, then retry.";
  if (seconds < 90) return `Retry after ${seconds} seconds.`;
  if (seconds < 5_400) {
    return `Retry after about ${Math.ceil(seconds / 60)} minutes.`;
  }
  return `Retry after about ${Math.ceil(seconds / 3_600)} hours.`;
}

export async function classifyApiErrorResponse(
  response: Response,
): Promise<ClassifiedApiError> {
  const payload = await readBoundedErrorPayload(response);
  const error = canonicalErrorObject(payload);
  const apiCode = boundedString(
    fieldFrom(error, payload, "code") ?? fieldFrom(error, payload, "error_code"),
    64,
  );
  const normalizedCode =
    apiCode && /^[A-Z0-9_]+$/.test(apiCode) ? apiCode : undefined;
  const apiMessage = boundedString(
    fieldFrom(error, payload, "message"),
    MAX_ERROR_MESSAGE_CHARS,
  );
  const details = error && isObject(error.details) ? error.details : null;
  const recoveryUrl =
    fieldFrom(error, payload, "recovery_url") ?? details?.recovery_url;
  const upgradeUrl =
    fieldFrom(error, payload, "upgrade_url") ?? details?.upgrade_url;

  if (response.status === 401) {
    return {
      label: "Invalid key",
      code: "AUTH_INVALID",
      message:
        "API key invalid or expired. Open the OilPrice pane and replace it",
      apiMessage,
    };
  }

  if (response.status === 403) {
    if (normalizedCode === "API_ACCESS_SUSPENDED") {
      return {
        label: "Access suspended",
        code: "API_ACCESS_SUSPENDED",
        message: `API access is suspended. Contact support: ${SUPPORT_URL}`,
        apiMessage,
      };
    }
    if (normalizedCode === "EMAIL_CONFIRMATION_REQUIRED") {
      return {
        label: "Confirm email",
        code: "EMAIL_CONFIRMATION_REQUIRED",
        message:
          "Confirm your email to continue. Request a new confirmation: " +
          trustedOilPriceUrl(recoveryUrl, CONFIRMATION_URL),
        apiMessage,
      };
    }
    if (normalizedCode === "FORBIDDEN") {
      return {
        label: "Upgrade required",
        code: "UPGRADE_REQUIRED",
        message:
          "This account does not include the requested feature. Review " +
          trustedOilPriceUrl(upgradeUrl, PRICING_URL),
        apiMessage,
      };
    }
    return {
      label: "Access denied",
      code: "ACCESS_DENIED",
      message:
        "Access was denied for a reason the add-in could not verify. " +
        `Use Test Key, then contact support: ${SUPPORT_URL}`,
      apiMessage,
    };
  }

  if (response.status === 402) {
    return {
      label: "Quota reached",
      code: "UPGRADE_REQUIRED",
      message:
        "Quota or plan limit reached. Review " +
        trustedOilPriceUrl(upgradeUrl, PRICING_URL),
      apiMessage,
    };
  }

  if (response.status === 404) {
    return {
      label: "No data",
      code: "NO_DATA",
      message: "No data returned. Check the commodity code or query",
      apiMessage,
    };
  }

  if (response.status === 429) {
    return {
      label: "Rate limited",
      code: "RATE_LIMITED",
      message: `Rate limit reached. ${retryMessage(response)}`,
      apiMessage,
    };
  }

  if (
    (response.status === 400 || response.status === 422) &&
    apiMessage
  ) {
    return {
      label: "Invalid request",
      code: "INVALID_CODE",
      message: apiMessage,
      apiMessage,
    };
  }

  if (response.status >= 500) {
    return {
      label: "Server error",
      code: "SERVER_ERROR",
      message: "OilPriceAPI is temporarily unavailable.",
      apiMessage,
    };
  }

  return {
    label: `HTTP ${response.status}`,
    code: "HTTP_ERROR",
    message: `OilPriceAPI returned HTTP ${response.status}.`,
    apiMessage,
  };
}
