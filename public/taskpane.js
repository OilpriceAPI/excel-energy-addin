/**
 * Taskpane UI Logic
 * Handles user interactions and connects to Excel operations
 */

/* global Office, Excel */

// API Key Storage Key
const API_KEY_STORAGE = 'oilpriceapi_key';

// Initialize when Office is ready
Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    console.log('Excel Energy Comparison Add-in loaded');

    // Set up event listeners
    setupEventListeners();

    // Load saved API key
    loadApiKey();
  }
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Settings
  document.getElementById('save-key-btn')?.addEventListener('click', saveApiKey);
  document.getElementById('test-connection-btn')?.addEventListener('click', testConnection);

  // Actions
  document.getElementById('fetch-prices-btn')?.addEventListener('click', fetchPrices);
  document.getElementById('convert-btn')?.addEventListener('click', convertPrices);
}

/**
 * Load API key from localStorage
 */
function loadApiKey() {
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  if (apiKey) {
    const input = document.getElementById('api-key');
    if (input) {
      input.value = apiKey;
    }
  }
}

/**
 * Save API key to localStorage
 */
function saveApiKey() {
  const input = document.getElementById('api-key');
  const apiKey = input?.value?.trim();

  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }

  localStorage.setItem(API_KEY_STORAGE, apiKey);
  showStatus('API key saved successfully');
}

/**
 * Test API connection
 */
async function testConnection() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('Please enter and save your API key first');
    return;
  }

  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    statusEl.textContent = 'Testing...';
    statusEl.className = 'status-text';
  }

  try {
    // Import the testConnection function from bundle
    const success = await window.ExcelEnergyAddin.testConnection(apiKey);

    if (statusEl) {
      if (success) {
        statusEl.textContent = '✓ Connected';
        statusEl.className = 'status-text success';
      } else {
        statusEl.textContent = '✗ Failed';
        statusEl.className = 'status-text error';
      }
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = '✗ Error';
      statusEl.className = 'status-text error';
    }
    showError(`Connection test failed: ${error.message}`);
  }
}

/**
 * Fetch prices from API
 */
async function fetchPrices() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('Please enter and save your API key first');
    return;
  }

  // Get selected commodities
  const checkboxes = document.querySelectorAll('#commodity-list input[type="checkbox"]:checked');
  const codes = Array.from(checkboxes).map(cb => cb.value);

  if (codes.length === 0) {
    showError('Please select at least one commodity');
    return;
  }

  try {
    showStatus(`Fetching ${codes.length} prices...`);

    // Fetch prices
    const prices = await window.ExcelEnergyAddin.fetchPrices(apiKey, codes);

    if (prices.length === 0) {
      showError('No prices fetched. Check your API key and try again.');
      return;
    }

    // Create Data sheet
    await window.ExcelEnergyAddin.createDataSheet(prices);

    showStatus(`✓ Successfully fetched ${prices.length} prices and created Data sheet`);

    // Enable convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      convertBtn.disabled = false;
    }
  } catch (error) {
    showError(`Error fetching prices: ${error.message}`);
  }
}

/**
 * Convert prices to MBtu
 */
async function convertPrices() {
  try {
    showStatus('Converting prices to $/MBtu...');

    // Create Process sheet with conversions
    await window.ExcelEnergyAddin.createProcessSheet();

    showStatus('✓ Successfully created Process sheet with MBtu conversions');
  } catch (error) {
    showError(`Error converting prices: ${error.message}`);
  }
}

/**
 * Get API key from localStorage
 */
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE);
}

/**
 * Show status message
 */
function showStatus(message) {
  const statusEl = document.getElementById('status-message');
  const errorEl = document.getElementById('error-message');

  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = 'status-message visible';
  }

  if (errorEl) {
    errorEl.className = 'error-message';
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (statusEl) {
      statusEl.className = 'status-message';
    }
  }, 5000);
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('error-message');
  const statusEl = document.getElementById('status-message');

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.className = 'error-message visible';
  }

  if (statusEl) {
    statusEl.className = 'status-message';
  }

  // Auto-hide after 8 seconds
  setTimeout(() => {
    if (errorEl) {
      errorEl.className = 'error-message';
    }
  }, 8000);
}
