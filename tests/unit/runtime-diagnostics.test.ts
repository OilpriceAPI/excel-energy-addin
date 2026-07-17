import {
  classifyNetworkFailure,
  createRuntimeDiagnostic,
  formatRuntimeDiagnostic,
  parseRuntimeDiagnostic,
  requestIdFromResponse,
} from "../../src/utils/runtime-diagnostics";

describe("Excel runtime diagnostics", () => {
  test("classifies an online fetch rejection as browser/network/CORS", () => {
    expect(classifyNetworkFailure(true)).toEqual({
      result: "network-or-cors",
      code: "NETWORK_OR_CORS",
      message: "The browser or CORS policy blocked the API request",
      recovery:
        "Copy diagnostics and contact support. Do not replace the API key unless the pane reports AUTH_INVALID.",
    });
  });

  test("classifies an explicitly offline browser separately", () => {
    expect(classifyNetworkFailure(false)).toEqual({
      result: "offline",
      code: "OFFLINE",
      message: "This device appears to be offline",
      recovery: "Reconnect to the internet, then try again.",
    });
  });

  test("stores only a safe endpoint path and request id", () => {
    const diagnostic = createRuntimeDiagnostic({
      source: "taskpane",
      result: "success",
      code: "OK",
      endpoint: "/v1/prices/latest?by_code=BRENT_CRUDE_USD&token=secret",
      durationMs: 42.4,
      httpStatus: 200,
      requestId: "request-123",
      at: "2026-07-17T12:00:00Z",
    });

    expect(diagnostic).toEqual({
      schemaVersion: 1,
      source: "taskpane",
      result: "success",
      code: "OK",
      endpoint: "/v1/prices/latest",
      durationMs: 42,
      httpStatus: 200,
      requestId: "request-123",
      at: "2026-07-17T12:00:00.000Z",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("secret");
    expect(JSON.stringify(diagnostic)).not.toContain("BRENT_CRUDE_USD");
  });

  test("rejects malformed persisted diagnostics", () => {
    expect(parseRuntimeDiagnostic("not json")).toBeNull();
    expect(parseRuntimeDiagnostic('{"schemaVersion":2}')).toBeNull();
  });

  test("sanitizes persisted values before displaying them", () => {
    const diagnostic = parseRuntimeDiagnostic(
      JSON.stringify({
        schemaVersion: 1,
        source: "custom-function",
        result: "http-error",
        code: "AUTH_INVALID<script>",
        endpoint: "https://example.com/?token=secret",
        at: "2026-07-17T12:00:00Z",
        durationMs: 12,
        httpStatus: 401,
        requestId: "unsafe request id",
      }),
    );

    expect(diagnostic).toEqual({
      schemaVersion: 1,
      source: "custom-function",
      result: "http-error",
      code: "UNKNOWN",
      endpoint: "unknown",
      at: "2026-07-17T12:00:00.000Z",
      durationMs: 12,
      httpStatus: 401,
    });
  });

  test("reads a safe server request id when CORS exposes it", () => {
    const response = {
      headers: new Headers({ "x-request-id": "01c7034e-c85c-49d8-b1e9" }),
    };
    expect(requestIdFromResponse(response)).toBe(
      "01c7034e-c85c-49d8-b1e9",
    );
  });

  test("formats a compact in-pane summary", () => {
    const diagnostic = createRuntimeDiagnostic({
      source: "taskpane",
      result: "http-error",
      code: "AUTH_INVALID",
      endpoint: "/v1/prices/latest",
      durationMs: 100,
      httpStatus: 401,
      at: "2026-07-17T12:00:00Z",
    });
    expect(formatRuntimeDiagnostic(diagnostic)).toBe(
      "AUTH_INVALID / HTTP 401 / 100 ms / 2026-07-17T12:00:00.000Z",
    );
  });
});
