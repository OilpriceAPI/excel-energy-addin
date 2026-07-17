export const RUNTIME_DIAGNOSTIC_STORAGE_KEY =
  "opa_excel_last_runtime_diagnostic";

export type RuntimeDiagnosticSource = "taskpane" | "custom-function";

export type RuntimeDiagnosticResult =
  | "success"
  | "http-error"
  | "network-or-cors"
  | "offline"
  | "invalid-response";

export interface RuntimeDiagnostic {
  schemaVersion: 1;
  source: RuntimeDiagnosticSource;
  result: RuntimeDiagnosticResult;
  code: string;
  endpoint: string;
  at: string;
  durationMs: number;
  httpStatus?: number;
  requestId?: string;
}

export interface RuntimeDiagnosticInput {
  source: RuntimeDiagnosticSource;
  result: RuntimeDiagnosticResult;
  code: string;
  endpoint: string;
  durationMs: number;
  httpStatus?: number;
  requestId?: string | null;
  at?: string;
}

export interface NetworkFailureClassification {
  result: "network-or-cors" | "offline";
  code: "NETWORK_OR_CORS" | "OFFLINE";
  message: string;
  recovery: string;
}

const DIAGNOSTIC_RESULTS = new Set<RuntimeDiagnosticResult>([
  "success",
  "http-error",
  "network-or-cors",
  "offline",
  "invalid-response",
]);

const DIAGNOSTIC_SOURCES = new Set<RuntimeDiagnosticSource>([
  "taskpane",
  "custom-function",
]);

function safeEndpoint(endpoint: string): string {
  const path = (endpoint || "").split("?", 1)[0];
  return /^\/v1\/[A-Za-z0-9_./-]+$/.test(path) ? path : "unknown";
}

function safeCode(code: string): string {
  return /^[A-Z0-9_]{1,64}$/.test(code) ? code : "UNKNOWN";
}

function safeDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 0;
  return Math.min(Math.round(durationMs), 300_000);
}

function safeStatus(status?: number): number | undefined {
  return Number.isInteger(status) && status! >= 100 && status! <= 599
    ? status
    : undefined;
}

function safeRequestId(requestId?: string | null): string | undefined {
  if (!requestId || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
    return undefined;
  }
  return requestId;
}

function safeTimestamp(at?: string): string {
  if (at && Number.isFinite(Date.parse(at))) {
    return new Date(at).toISOString();
  }
  return new Date().toISOString();
}

export function classifyNetworkFailure(
  online: boolean | undefined,
): NetworkFailureClassification {
  if (online === false) {
    return {
      result: "offline",
      code: "OFFLINE",
      message: "This device appears to be offline",
      recovery: "Reconnect to the internet, then try again.",
    };
  }

  return {
    result: "network-or-cors",
    code: "NETWORK_OR_CORS",
    message: "The browser or CORS policy blocked the API request",
    recovery:
      "Copy diagnostics and contact support. Do not replace the API key unless the pane reports AUTH_INVALID.",
  };
}

export function createRuntimeDiagnostic(
  input: RuntimeDiagnosticInput,
): RuntimeDiagnostic {
  const diagnostic: RuntimeDiagnostic = {
    schemaVersion: 1,
    source: input.source,
    result: input.result,
    code: safeCode(input.code),
    endpoint: safeEndpoint(input.endpoint),
    at: safeTimestamp(input.at),
    durationMs: safeDuration(input.durationMs),
  };

  const httpStatus = safeStatus(input.httpStatus);
  if (httpStatus !== undefined) diagnostic.httpStatus = httpStatus;

  const requestId = safeRequestId(input.requestId);
  if (requestId) diagnostic.requestId = requestId;

  return diagnostic;
}

export function parseRuntimeDiagnostic(
  raw: string | null | undefined,
): RuntimeDiagnostic | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeDiagnostic>;
    if (
      parsed.schemaVersion !== 1 ||
      !DIAGNOSTIC_SOURCES.has(parsed.source as RuntimeDiagnosticSource) ||
      !DIAGNOSTIC_RESULTS.has(parsed.result as RuntimeDiagnosticResult) ||
      typeof parsed.code !== "string" ||
      typeof parsed.endpoint !== "string" ||
      typeof parsed.at !== "string" ||
      typeof parsed.durationMs !== "number"
    ) {
      return null;
    }

    return createRuntimeDiagnostic({
      source: parsed.source as RuntimeDiagnosticSource,
      result: parsed.result as RuntimeDiagnosticResult,
      code: parsed.code,
      endpoint: parsed.endpoint,
      at: parsed.at,
      durationMs: parsed.durationMs,
      httpStatus: parsed.httpStatus,
      requestId: parsed.requestId,
    });
  } catch {
    return null;
  }
}

export function requestIdFromResponse(
  response: Pick<Response, "headers"> | { headers?: Headers } | null | undefined,
): string | undefined {
  try {
    return safeRequestId(response?.headers?.get("x-request-id"));
  } catch {
    return undefined;
  }
}

export function formatRuntimeDiagnostic(
  diagnostic: RuntimeDiagnostic | null,
): string {
  if (!diagnostic) return "Not run";

  const parts = [diagnostic.code];
  if (diagnostic.httpStatus) parts.push(`HTTP ${diagnostic.httpStatus}`);
  parts.push(`${diagnostic.durationMs} ms`);
  parts.push(diagnostic.at);
  return parts.join(" / ");
}
