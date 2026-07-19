import {
  OILPRICEAPI_EXCEL_CLIENT,
  OILPRICEAPI_EXCEL_VERSION,
} from "../utils/client-attribution";
import {
  RUNTIME_DIAGNOSTIC_STORAGE_KEY,
  RuntimeDiagnostic,
  classifyNetworkFailure,
  createRuntimeDiagnostic,
  formatRuntimeDiagnostic,
  parseRuntimeDiagnostic,
  requestIdFromResponse,
} from "../utils/runtime-diagnostics";

declare const OfficeRuntime: {
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
};

interface OfficeReadyInfo {
  host?: Office.HostType;
  platform?: Office.PlatformType;
}

const API_KEY_STORAGE = "oilpriceapi_key";
const TEST_URL =
  "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD";
const TEST_ENDPOINT = "/v1/prices/latest";
const REQUEST_TIMEOUT_MS = 15_000;

interface TaskpaneDiagnostics {
  version: string;
  client: string;
  host: string;
  platform: string;
  officeVersion: string;
  requirements: string;
  online: string;
  storage: string;
  lastRequest: RuntimeDiagnostic | null;
}

const diagnostics: TaskpaneDiagnostics = {
  version: OILPRICEAPI_EXCEL_VERSION,
  client: OILPRICEAPI_EXCEL_CLIENT,
  host: "Unknown",
  platform: "Unknown",
  officeVersion: "Unknown",
  requirements: "Unknown",
  online: browserOnlineLabel(),
  storage: "Unknown",
  lastRequest: null,
};

Office.onReady((info) => {
  void initializeTaskpane(info);
});

async function initializeTaskpane(info: OfficeReadyInfo): Promise<void> {
  updateDiagnostics({
    host: info.host ? String(info.host) : "Unknown",
    platform: info.platform ? String(info.platform) : "Unknown",
    officeVersion: officeVersionLabel(),
    requirements: requirementSupportLabel(),
    online: browserOnlineLabel(),
    storage: sharedStorageLabel(),
  });

  setupEventListeners();
  await loadLastRuntimeDiagnostic();

  if (info.host !== Office.HostType.Excel) {
    showError("Open this pane from Excel to save and test an API key.");
    return;
  }

  await loadApiKeyState();
}

function setupEventListeners(): void {
  document.getElementById("save-key-btn")?.addEventListener("click", () => {
    void saveApiKey();
  });
  document
    .getElementById("test-connection-btn")
    ?.addEventListener("click", () => {
      void testConnection();
    });
  document.getElementById("clear-key-btn")?.addEventListener("click", () => {
    void clearApiKey();
  });
  document
    .getElementById("refresh-diagnostics-btn")
    ?.addEventListener("click", () => {
      void refreshDiagnostics();
    });
  document
    .getElementById("copy-diagnostics-btn")
    ?.addEventListener("click", () => {
      void copyDiagnostics();
    });

  window.addEventListener("online", updateBrowserOnlineState);
  window.addEventListener("offline", updateBrowserOnlineState);
}

function hasSharedStorage(): boolean {
  return Boolean(
    typeof OfficeRuntime !== "undefined" &&
    OfficeRuntime.storage &&
    typeof OfficeRuntime.storage.getItem === "function" &&
    typeof OfficeRuntime.storage.setItem === "function",
  );
}

function sharedStorageLabel(): string {
  return hasSharedStorage() ? "Available" : "Unavailable";
}

async function storageGet(key: string): Promise<string | null> {
  if (!hasSharedStorage()) throw new Error("SHARED_STORAGE_UNAVAILABLE");

  try {
    return await OfficeRuntime.storage.getItem(key);
  } catch {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  if (!hasSharedStorage()) throw new Error("SHARED_STORAGE_UNAVAILABLE");

  try {
    await OfficeRuntime.storage.setItem(key, value);
  } catch {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }
}

async function storageRemove(key: string): Promise<void> {
  if (!hasSharedStorage()) throw new Error("SHARED_STORAGE_UNAVAILABLE");

  try {
    await OfficeRuntime.storage.removeItem(key);
  } catch {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }
}

async function persistRuntimeDiagnostic(
  diagnostic: RuntimeDiagnostic,
): Promise<void> {
  try {
    await storageSet(
      RUNTIME_DIAGNOSTIC_STORAGE_KEY,
      JSON.stringify(diagnostic),
    );
  } catch {
    // A diagnostics write must not replace the real connection result.
  }
}

async function loadApiKeyState(): Promise<void> {
  updateDiagnostics({ storage: sharedStorageLabel() });
  try {
    const apiKey = await storageGet(API_KEY_STORAGE);
    setConnectionStatus(
      apiKey ? "Key saved" : "No key saved",
      apiKey ? "success" : "",
    );
  } catch {
    setConnectionStatus("Storage unavailable", "error");
  }
}

async function saveApiKey(): Promise<void> {
  const input = document.getElementById("api-key") as HTMLInputElement | null;
  const apiKey = input?.value?.trim();

  if (!apiKey) {
    showError("Paste an OilPriceAPI key first.");
    return;
  }

  try {
    await storageSet(API_KEY_STORAGE, apiKey);
    updateDiagnostics({ storage: "Available" });
    if (input) input.value = "";
    showStatus(
      "API key saved. Use Formulas > Calculate Now to refresh formulas.",
    );
    setConnectionStatus("Key saved", "success");
  } catch {
    updateDiagnostics({ storage: "Unavailable" });
    setConnectionStatus("Storage unavailable", "error");
    showError(
      "Excel shared storage is unavailable. Reload the add-in, then save the key again.",
    );
  }
}

async function clearApiKey(): Promise<void> {
  try {
    await storageRemove(API_KEY_STORAGE);
    updateDiagnostics({ storage: sharedStorageLabel() });
    setConnectionStatus("No key saved", "");
    showStatus("API key cleared.");
  } catch {
    updateDiagnostics({ storage: "Unavailable" });
    setConnectionStatus("Storage unavailable", "error");
    showError(
      "Excel shared storage is unavailable. Reload the add-in, then try again.",
    );
  }
}

function browserOnlineState(): boolean | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.onLine;
}

function browserOnlineLabel(): string {
  return browserOnlineState() === false ? "Offline" : "Online";
}

function updateBrowserOnlineState(): void {
  updateDiagnostics({ online: browserOnlineLabel() });
}

function officeVersionLabel(): string {
  try {
    return Office.context.diagnostics.version || "Unknown";
  } catch {
    return "Unknown";
  }
}

function requirementSupportLabel(): string {
  try {
    const requirements = Office.context.requirements;
    const sharedRuntime = requirements.isSetSupported("SharedRuntime", "1.1");
    const customFunctions = requirements.isSetSupported(
      "CustomFunctionsRuntime",
      "1.1",
    );
    return `Shared ${sharedRuntime ? "yes" : "no"}; Functions ${
      customFunctions ? "yes" : "no"
    }`;
  } catch {
    return "Unknown";
  }
}

interface HttpResult {
  label: string;
  code: string;
  message: string;
}

function classifyHttpResult(status: number): HttpResult {
  if (status === 401) {
    return {
      label: "Invalid key",
      code: "AUTH_INVALID",
      message: "API key invalid or expired.",
    };
  }
  if (status === 402) {
    return {
      label: "Quota reached",
      code: "UPGRADE_REQUIRED",
      message: "Quota or plan limit reached.",
    };
  }
  if (status === 403) {
    return {
      label: "Upgrade required",
      code: "UPGRADE_REQUIRED",
      message: "Your plan does not include this endpoint.",
    };
  }
  if (status === 429) {
    return {
      label: "Rate limited",
      code: "RATE_LIMITED",
      message: "Rate limit reached. Try later.",
    };
  }
  if (status >= 500) {
    return {
      label: "Server error",
      code: "SERVER_ERROR",
      message: "OilPriceAPI is temporarily unavailable.",
    };
  }
  return {
    label: `HTTP ${status}`,
    code: "HTTP_ERROR",
    message: `OilPriceAPI returned HTTP ${status}.`,
  };
}

async function testConnection(): Promise<void> {
  let apiKey: string | null;
  try {
    apiKey = await storageGet(API_KEY_STORAGE);
    updateDiagnostics({ storage: "Available" });
  } catch {
    setConnectionStatus("Storage unavailable", "error");
    showError(
      "Excel shared storage is unavailable. Reload the add-in, save the key, then test again.",
    );
    return;
  }

  if (!apiKey) {
    showError("Save an API key before testing.");
    setConnectionStatus("No key", "error");
    return;
  }

  setConnectionStatus("Testing...", "");
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TEST_URL, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;
    const requestId = requestIdFromResponse(response);

    if (!response.ok) {
      const result = classifyHttpResult(response.status);
      await recordRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "taskpane",
          result: "http-error",
          code: result.code,
          endpoint: TEST_ENDPOINT,
          durationMs,
          httpStatus: response.status,
          requestId,
        }),
      );
      setConnectionStatus(result.label, "error");
      showError(result.message);
      return;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) {
        throw error;
      }
      await recordRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "taskpane",
          result: "invalid-response",
          code: "INVALID_RESPONSE",
          endpoint: TEST_ENDPOINT,
          durationMs,
          httpStatus: response.status,
          requestId,
        }),
      );
      setConnectionStatus("Invalid response", "error");
      showError(
        "OilPriceAPI returned an unreadable response. Copy diagnostics and contact support.",
      );
      return;
    }

    const price = (payload as { data?: { price?: unknown } })?.data?.price;
    if (typeof price !== "number" || !Number.isFinite(price)) {
      await recordRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "taskpane",
          result: "invalid-response",
          code: "INVALID_RESPONSE",
          endpoint: TEST_ENDPOINT,
          durationMs,
          httpStatus: response.status,
          requestId,
        }),
      );
      setConnectionStatus("Invalid response", "error");
      showError(
        "OilPriceAPI connected but returned no numeric Brent price. Copy diagnostics and contact support.",
      );
      return;
    }

    await recordRuntimeDiagnostic(
      createRuntimeDiagnostic({
        source: "taskpane",
        result: "success",
        code: "OK",
        endpoint: TEST_ENDPOINT,
        durationMs,
        httpStatus: response.status,
        requestId,
      }),
    );
    setConnectionStatus("Connected", "success");
    showStatus("Connected to OilPriceAPI.");
  } catch {
    if (controller.signal.aborted) {
      await recordRuntimeDiagnostic(
        createRuntimeDiagnostic({
          source: "taskpane",
          result: "timeout",
          code: "TIMEOUT",
          endpoint: TEST_ENDPOINT,
          durationMs: Date.now() - startedAt,
        }),
      );
      setConnectionStatus("Timed out", "error");
      showError(
        "OilPriceAPI did not respond within 15 seconds. Try again, then check service status.",
      );
      return;
    }
    const failure = classifyNetworkFailure(browserOnlineState());
    await recordRuntimeDiagnostic(
      createRuntimeDiagnostic({
        source: "taskpane",
        result: failure.result,
        code: failure.code,
        endpoint: TEST_ENDPOINT,
        durationMs: Date.now() - startedAt,
      }),
    );
    setConnectionStatus(
      failure.code === "OFFLINE" ? "Offline" : "Browser/CORS blocked",
      "error",
    );
    showError(`${failure.message}. ${failure.recovery}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function recordRuntimeDiagnostic(
  diagnostic: RuntimeDiagnostic,
): Promise<void> {
  diagnostics.lastRequest = diagnostic;
  await persistRuntimeDiagnostic(diagnostic);
  updateDiagnostics({ lastRequest: diagnostic });
  console.info("[OilPrice diagnostics]", diagnostic);
}

async function loadLastRuntimeDiagnostic(): Promise<void> {
  try {
    const raw = await storageGet(RUNTIME_DIAGNOSTIC_STORAGE_KEY);
    updateDiagnostics({ lastRequest: parseRuntimeDiagnostic(raw) });
  } catch {
    updateDiagnostics({ lastRequest: null });
  }
}

async function refreshDiagnostics(): Promise<void> {
  updateDiagnostics({
    officeVersion: officeVersionLabel(),
    requirements: requirementSupportLabel(),
    online: browserOnlineLabel(),
    storage: sharedStorageLabel(),
  });
  await loadLastRuntimeDiagnostic();
  showStatus("Diagnostics refreshed.");
}

function updateDiagnostics(next: Partial<TaskpaneDiagnostics>): void {
  Object.assign(diagnostics, next);
  setText("diag-version", diagnostics.version);
  setText(
    "diag-excel",
    `${diagnostics.host} / ${diagnostics.platform} / ${diagnostics.officeVersion}`,
  );
  setText("diag-requirements", diagnostics.requirements);
  setText("diag-online", diagnostics.online);
  setText("diag-storage", diagnostics.storage);
  setText(
    "diag-last-request",
    formatRuntimeDiagnostic(diagnostics.lastRequest),
  );
  setText(
    "diag-request-id",
    diagnostics.lastRequest?.requestId || "Not available",
  );
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

async function copyDiagnostics(): Promise<void> {
  await loadLastRuntimeDiagnostic();
  const lastRequest = diagnostics.lastRequest;
  const text = [
    "OilPrice Excel Add-in diagnostics",
    `Version: ${diagnostics.version}`,
    `Client: ${diagnostics.client}`,
    `Excel: ${diagnostics.host} / ${diagnostics.platform}`,
    `Office version: ${diagnostics.officeVersion}`,
    `Requirements: ${diagnostics.requirements}`,
    `Browser connectivity: ${diagnostics.online}`,
    `Shared storage: ${diagnostics.storage}`,
    `Last request source: ${lastRequest?.source || "none"}`,
    `Last request result: ${lastRequest?.result || "none"}`,
    `Last request code: ${lastRequest?.code || "none"}`,
    `Last HTTP status: ${lastRequest?.httpStatus || "none"}`,
    `Last endpoint: ${lastRequest?.endpoint || "none"}`,
    `Last duration: ${lastRequest ? `${lastRequest.durationMs} ms` : "none"}`,
    `Last request ID: ${lastRequest?.requestId || "none"}`,
    `Last request at: ${lastRequest?.at || "none"}`,
    `Task pane origin: ${window.location.origin}`,
    "API key included: no",
  ].join("\n");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      copyTextFallback(text);
    }
    showStatus("Diagnostics copied. API key was not included.");
  } catch {
    copyTextFallback(text);
    showStatus("Diagnostics copied. API key was not included.");
  }
}

function copyTextFallback(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function setConnectionStatus(message: string, state: string): void {
  const status = document.getElementById("connection-status");
  if (!status) return;
  status.textContent = message;
  status.className = `status-text ${state}`.trim();
}

function showStatus(message: string): void {
  const status = document.getElementById("status-message");
  const error = document.getElementById("error-message");
  if (status) {
    status.textContent = message;
    status.className = "status-message visible";
  }
  if (error) error.className = "error-message";
}

function showError(message: string): void {
  const error = document.getElementById("error-message");
  const status = document.getElementById("status-message");
  if (error) {
    error.textContent = message;
    error.className = "error-message visible";
  }
  if (status) status.className = "status-message";
}
