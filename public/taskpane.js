/* global Office, OfficeRuntime */

const API_KEY_STORAGE = "oilpriceapi_key";
const ADDIN_VERSION = "1.0.0";
const TEST_URL =
  "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD";
const TEST_ENDPOINT_LABEL = "/v1/prices/latest?by_code=BRENT_CRUDE_USD";

const diagnostics = {
  version: ADDIN_VERSION,
  host: "Unknown",
  platform: "Unknown",
  storage: "Unknown",
  lastTest: "Not tested",
  lastHttpStatus: "",
  lastEndpoint: TEST_ENDPOINT_LABEL,
  lastTestAt: "",
};

Office.onReady((info) => {
  if (info.host !== Office.HostType.Excel) {
    updateDiagnostics({
      host: info.host || "Unknown",
      platform: info.platform || "Unknown",
      storage: sharedStorageLabel(),
    });
    showError("Open this pane from Excel to save and test an API key.");
    return;
  }

  updateDiagnostics({
    host: info.host || "Excel",
    platform: info.platform || "Unknown",
    storage: sharedStorageLabel(),
  });
  setupEventListeners();
  loadApiKeyState();
});

function setupEventListeners() {
  document.getElementById("save-key-btn")?.addEventListener("click", saveApiKey);
  document
    .getElementById("test-connection-btn")
    ?.addEventListener("click", testConnection);
  document.getElementById("clear-key-btn")?.addEventListener("click", clearApiKey);
  document
    .getElementById("copy-diagnostics-btn")
    ?.addEventListener("click", copyDiagnostics);
}

async function storageGet(key) {
  if (!hasSharedStorage()) {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }

  try {
    return await OfficeRuntime.storage.getItem(key);
  } catch {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }
}

async function storageSet(key, value) {
  if (!hasSharedStorage()) {
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }

  try {
    await OfficeRuntime.storage.setItem(key, value);
    localStorage.setItem(key, value);
  } catch {
    localStorage.removeItem(key);
    throw new Error("SHARED_STORAGE_UNAVAILABLE");
  }
}

async function storageRemove(key) {
  if (!hasSharedStorage()) {
    localStorage.removeItem(key);
    return;
  }

  try {
    await OfficeRuntime.storage.removeItem(key);
  } finally {
    localStorage.removeItem(key);
  }
}

function hasSharedStorage() {
  return (
    typeof OfficeRuntime !== "undefined" &&
    OfficeRuntime.storage &&
    typeof OfficeRuntime.storage.getItem === "function" &&
    typeof OfficeRuntime.storage.setItem === "function"
  );
}

function sharedStorageLabel() {
  return hasSharedStorage() ? "Available" : "Unavailable";
}

async function loadApiKeyState() {
  updateDiagnostics({ storage: sharedStorageLabel() });
  try {
    const apiKey = await storageGet(API_KEY_STORAGE);
    if (apiKey) {
      setConnectionStatus("Key saved", "success");
    }
  } catch {
    setConnectionStatus("Storage unavailable", "error");
  }
}

async function saveApiKey() {
  const input = document.getElementById("api-key");
  const apiKey = input?.value?.trim();

  if (!apiKey) {
    showError("Paste an OilPriceAPI key first.");
    return;
  }

  try {
    await storageSet(API_KEY_STORAGE, apiKey);
    updateDiagnostics({ storage: "Available" });
    if (input) input.value = "";
    showStatus("API key saved. Use Formulas > Calculate Now to refresh formulas.");
    setConnectionStatus("Key saved", "success");
  } catch {
    updateDiagnostics({ storage: "Unavailable" });
    setConnectionStatus("Storage unavailable", "error");
    showError("Excel shared storage is unavailable. Reload the add-in, then save the key again.");
  }
}

async function clearApiKey() {
  try {
    await storageRemove(API_KEY_STORAGE);
    updateDiagnostics({ storage: sharedStorageLabel() });
    setConnectionStatus("No key saved", "");
    showStatus("API key cleared.");
  } catch {
    updateDiagnostics({ storage: "Unavailable" });
    setConnectionStatus("Storage unavailable", "error");
    showError("Excel shared storage is unavailable. Reload the add-in, then try again.");
  }
}

async function testConnection() {
  let apiKey;
  try {
    apiKey = await storageGet(API_KEY_STORAGE);
    updateDiagnostics({ storage: "Available" });
  } catch {
    updateDiagnostics({ storage: "Unavailable" });
    recordConnectionResult("Storage unavailable");
    setConnectionStatus("Storage unavailable", "error");
    showError("Excel shared storage is unavailable. Reload the add-in, save the key, then test again.");
    return;
  }

  if (!apiKey) {
    recordConnectionResult("No key saved");
    showError("Save an API key before testing.");
    setConnectionStatus("No key", "error");
    return;
  }

  recordConnectionResult("Testing");
  setConnectionStatus("Testing...", "");

  try {
    const response = await fetch(TEST_URL, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "X-Excel-Addin-Version": ADDIN_VERSION,
      },
    });

    if (response.ok) {
      recordConnectionResult("Connected", response.status);
      setConnectionStatus("Connected", "success");
      showStatus("Connected to OilPriceAPI.");
      return;
    }

    if (response.status === 401) {
      recordConnectionResult("Invalid key", response.status);
      setConnectionStatus("Invalid key", "error");
      showError("API key invalid or expired.");
      return;
    }

    if (response.status === 402) {
      recordConnectionResult("Quota reached", response.status);
      setConnectionStatus("Quota reached", "error");
      showError("Quota or plan limit reached.");
      return;
    }

    if (response.status === 403) {
      recordConnectionResult("Upgrade required", response.status);
      setConnectionStatus("Upgrade required", "error");
      showError("Your plan does not include this endpoint.");
      return;
    }

    if (response.status === 429) {
      recordConnectionResult("Rate limited", response.status);
      setConnectionStatus("Rate limited", "error");
      showError("Rate limit reached. Try later.");
      return;
    }

    if (response.status >= 500) {
      recordConnectionResult("Server error", response.status);
      setConnectionStatus("Server error", "error");
      showError("OilPriceAPI is temporarily unavailable.");
      return;
    }

    recordConnectionResult(`HTTP ${response.status}`, response.status);
    setConnectionStatus(`HTTP ${response.status}`, "error");
    showError(`OilPriceAPI returned HTTP ${response.status}.`);
  } catch {
    recordConnectionResult("Network error");
    setConnectionStatus("Network error", "error");
    showError("Cannot reach OilPriceAPI. Check your connection.");
  }
}

function recordConnectionResult(label, httpStatus = "") {
  updateDiagnostics({
    lastTest: label,
    lastHttpStatus: httpStatus ? String(httpStatus) : "",
    lastEndpoint: TEST_ENDPOINT_LABEL,
    lastTestAt: new Date().toISOString(),
  });
}

function updateDiagnostics(next) {
  Object.assign(diagnostics, next);

  setText("diag-version", diagnostics.version);
  setText(
    "diag-excel",
    `${diagnostics.host || "Unknown"} / ${diagnostics.platform || "Unknown"}`,
  );
  setText("diag-storage", diagnostics.storage || "Unknown");
  setText("diag-last-test", formatLastTest());
}

function formatLastTest() {
  const parts = [diagnostics.lastTest || "Not tested"];
  if (diagnostics.lastHttpStatus) parts.push(`HTTP ${diagnostics.lastHttpStatus}`);
  if (diagnostics.lastTestAt) parts.push(diagnostics.lastTestAt);
  return parts.join(" / ");
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

async function copyDiagnostics() {
  const text = [
    `OilPrice Excel Add-in diagnostics`,
    `Version: ${diagnostics.version}`,
    `Excel: ${diagnostics.host || "Unknown"} / ${diagnostics.platform || "Unknown"}`,
    `Shared storage: ${diagnostics.storage || "Unknown"}`,
    `Last test: ${diagnostics.lastTest || "Not tested"}`,
    `Last HTTP status: ${diagnostics.lastHttpStatus || "none"}`,
    `Last endpoint: ${diagnostics.lastEndpoint || TEST_ENDPOINT_LABEL}`,
    `Last test at: ${diagnostics.lastTestAt || "not tested"}`,
  ].join("\n");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      copyTextFallback(text);
    }
    showStatus("Diagnostics copied.");
  } catch {
    copyTextFallback(text);
    showStatus("Diagnostics copied.");
  }
}

function copyTextFallback(text) {
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

function setConnectionStatus(message, state) {
  const statusEl = document.getElementById("connection-status");
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-text ${state || ""}`.trim();
}

function showStatus(message) {
  const statusEl = document.getElementById("status-message");
  const errorEl = document.getElementById("error-message");

  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = "status-message visible";
  }

  if (errorEl) {
    errorEl.className = "error-message";
  }
}

function showError(message) {
  const errorEl = document.getElementById("error-message");
  const statusEl = document.getElementById("status-message");

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.className = "error-message visible";
  }

  if (statusEl) {
    statusEl.className = "status-message";
  }
}
