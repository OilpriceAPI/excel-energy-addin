/* global Office, OfficeRuntime */

const API_KEY_STORAGE = "oilpriceapi_key";
const TEST_URL =
  "https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD";

Office.onReady((info) => {
  if (info.host !== Office.HostType.Excel) return;

  setupEventListeners();
  loadApiKeyState();
});

function setupEventListeners() {
  document.getElementById("save-key-btn")?.addEventListener("click", saveApiKey);
  document
    .getElementById("test-connection-btn")
    ?.addEventListener("click", testConnection);
  document.getElementById("clear-key-btn")?.addEventListener("click", clearApiKey);
}

async function storageGet(key) {
  try {
    return await OfficeRuntime.storage.getItem(key);
  } catch {
    return localStorage.getItem(key);
  }
}

async function storageSet(key, value) {
  try {
    await OfficeRuntime.storage.setItem(key, value);
  } finally {
    localStorage.setItem(key, value);
  }
}

async function storageRemove(key) {
  try {
    await OfficeRuntime.storage.removeItem(key);
  } catch {
    await storageSet(key, "");
  } finally {
    localStorage.removeItem(key);
  }
}

async function loadApiKeyState() {
  const apiKey = await storageGet(API_KEY_STORAGE);
  if (apiKey) {
    setConnectionStatus("Key saved", "success");
  }
}

async function saveApiKey() {
  const input = document.getElementById("api-key");
  const apiKey = input?.value?.trim();

  if (!apiKey) {
    showError("Paste an OilPriceAPI key first.");
    return;
  }

  await storageSet(API_KEY_STORAGE, apiKey);
  if (input) input.value = "";
  showStatus("API key saved. Use Formulas > Calculate Now to refresh formulas.");
  setConnectionStatus("Key saved", "success");
}

async function clearApiKey() {
  await storageRemove(API_KEY_STORAGE);
  setConnectionStatus("No key saved", "");
  showStatus("API key cleared.");
}

async function testConnection() {
  const apiKey = await storageGet(API_KEY_STORAGE);
  if (!apiKey) {
    showError("Save an API key before testing.");
    setConnectionStatus("No key", "error");
    return;
  }

  setConnectionStatus("Testing...", "");

  try {
    const response = await fetch(TEST_URL, {
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "X-Excel-Addin-Version": "1.0.0",
      },
    });

    if (response.ok) {
      setConnectionStatus("Connected", "success");
      showStatus("Connected to OilPriceAPI.");
      return;
    }

    if (response.status === 401) {
      setConnectionStatus("Invalid key", "error");
      showError("API key invalid or expired.");
      return;
    }

    if (response.status === 429) {
      setConnectionStatus("Rate limited", "error");
      showError("Rate limit reached. Try later.");
      return;
    }

    setConnectionStatus(`HTTP ${response.status}`, "error");
    showError(`OilPriceAPI returned HTTP ${response.status}.`);
  } catch {
    setConnectionStatus("Network error", "error");
    showError("Cannot reach OilPriceAPI. Check your connection.");
  }
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
