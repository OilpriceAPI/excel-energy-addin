/**
 * Taskpane UI Logic
 * Handles user interactions and connects to Excel operations
 */

/* global Office, Excel */

// API Key Storage Key
const API_KEY_STORAGE = 'oilpriceapi_key';

/**
 * Track analytics event
 */
function trackEvent(eventName, props = {}) {
  if (window.plausible) {
    window.plausible(eventName, { props });
  }
}

// Initialize when Office is ready
Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    console.log('Excel Energy Comparison Add-in loaded');

    // Track add-in opened
    trackEvent('Add-in Opened');

    // Set up event listeners
    setupEventListeners();

    // Load saved API key
    loadApiKey();

    // Check if first run
    checkFirstRun();

    // Set up keyboard shortcuts
    setupKeyboardShortcuts();

    // Fetch usage counter if API key exists
    if (getApiKey()) {
      fetchUsageCounter();
      checkUserTierAndShowFeatures();
    }
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

  // Welcome modal
  document.getElementById('get-api-key-btn')?.addEventListener('click', openSignupPage);
  document.getElementById('close-welcome-btn')?.addEventListener('click', closeWelcomeModal);

  // Historical data
  document.getElementById('fetch-past-year-btn')?.addEventListener('click', fetchPastYear);
  document.getElementById('fetch-past-month-btn')?.addEventListener('click', fetchPastMonth);

  // Bulk fetch
  document.getElementById('fetch-all-btn')?.addEventListener('click', fetchAllPrices);
}

/**
 * Check if this is first run
 */
function checkFirstRun() {
  const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
  if (!hasSeenWelcome) {
    showWelcomeModal();
  }
}

/**
 * Show welcome modal
 */
function showWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.add('visible');
  }
}

/**
 * Close welcome modal
 */
function closeWelcomeModal() {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.classList.remove('visible');
    localStorage.setItem('hasSeenWelcome', 'true');
    trackEvent('Welcome Modal Closed');
  }
}

/**
 * Open signup page in new window
 */
function openSignupPage() {
  trackEvent('Get API Key Clicked');
  window.open('https://www.oilpriceapi.com/signup', '_blank');
  closeWelcomeModal();
}

/**
 * Set up keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl+P or Cmd+P for fetch prices
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      const fetchBtn = document.getElementById('fetch-prices-btn');
      if (fetchBtn && !fetchBtn.disabled) {
        fetchPrices();
      }
    }
  });
}

/**
 * Fetch usage counter from API
 */
async function fetchUsageCounter() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    // Call the API to get usage stats
    const response = await fetch('https://api.oilpriceapi.com/v1/usage', {
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      updateUsageDisplay(data);
    }
  } catch (error) {
    console.error('Failed to fetch usage counter:', error);
  }
}

/**
 * Update usage display
 */
function updateUsageDisplay(data) {
  const usageSection = document.getElementById('usage-counter-section');
  const usageCounter = document.getElementById('usage-counter');

  if (usageSection && usageCounter && data) {
    const used = data.used || 0;
    const limit = data.limit || 1000;

    usageCounter.textContent = `${used.toLocaleString()} / ${limit.toLocaleString()} requests`;
    usageSection.style.display = 'block';
  }
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
async function saveApiKey() {
  const input = document.getElementById('api-key');
  const apiKey = input?.value?.trim();

  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }

  // Validate API key before saving
  showStatus('Validating API key...');

  try {
    const isValid = await window.ExcelEnergyAddin.testConnection(apiKey);

    if (isValid) {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
      showStatus('✓ API key saved and validated!');
      trackEvent('API Key Saved');

      // Fetch usage counter after saving valid key
      fetchUsageCounter();
    } else {
      showError('Invalid API key. Please check and try again.');
      trackEvent('API Key Invalid');
    }
  } catch (error) {
    showError('Failed to validate API key: ' + error);
    trackEvent('Error Occurred', { error: 'API Key Validation Failed' });
  }
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
    showError(error);
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
      trackEvent('Error Occurred', { error: 'No Prices Fetched' });
      return;
    }

    // Create Data sheet
    await window.ExcelEnergyAddin.createDataSheet(prices);

    showStatus(`✓ Successfully fetched ${prices.length} prices and created Data sheet`);
    trackEvent('Prices Fetched', { commodities: codes.join(','), count: prices.length });

    // Enable convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      convertBtn.disabled = false;
    }
  } catch (error) {
    showError(error);
    trackEvent('Error Occurred', { error: 'Fetch Prices Failed' });
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
    trackEvent('Converted to MBtu');
  } catch (error) {
    showError(error);
    trackEvent('Error Occurred', { error: 'Conversion Failed' });
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

/**
 * Check user tier and show/hide features accordingly
 */
async function checkUserTierAndShowFeatures() {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const client = new window.ExcelEnergyAddin.OilPriceAPIClient(apiKey);
    const tier = await client.getUserTier();

    // Show/hide historical data features based on tier
    const historicalGate = document.getElementById('historical-tier-gate');
    const historicalUI = document.getElementById('historical-feature-ui');

    if (tier.canAccessHistorical) {
      // Paid user - show feature UI
      if (historicalGate) historicalGate.style.display = 'none';
      if (historicalUI) historicalUI.style.display = 'block';
    } else {
      // Free user - show paywall
      if (historicalGate) historicalGate.style.display = 'block';
      if (historicalUI) historicalUI.style.display = 'none';

      // Track paywall shown
      trackEvent('Paywall Shown', { feature: 'historical_data' });
    }
  } catch (error) {
    console.error('Failed to check user tier:', error);
  }
}

/**
 * Fetch all prices in one API call (efficient)
 */
async function fetchAllPrices() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('Please enter and save your API key first');
    return;
  }

  try {
    showStatus('Fetching all commodity prices...');

    const client = new window.ExcelEnergyAddin.OilPriceAPIClient(apiKey);
    const prices = await client.getAllPrices();

    if (prices.length === 0) {
      showError('No prices fetched. Check your API key and try again.');
      return;
    }

    // Create Data sheet
    await window.ExcelEnergyAddin.createDataSheet(prices);

    showStatus(`✓ Successfully fetched ${prices.length} prices in 1 API call`);
    trackEvent('Bulk Fetch All', { count: prices.length });

    // Enable convert button
    const convertBtn = document.getElementById('convert-btn');
    if (convertBtn) {
      convertBtn.disabled = false;
    }
  } catch (error) {
    showError(error.userMessage || error.message);
    trackEvent('Error Occurred', { error: 'Bulk Fetch Failed' });
  }
}

/**
 * Fetch past year of historical data
 */
async function fetchPastYear() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('Please enter and save your API key first');
    return;
  }

  const select = document.getElementById('historical-commodity');
  const code = select?.value;

  if (!code) {
    showError('Please select a commodity');
    return;
  }

  try {
    showStatus(`Fetching past year for ${code}...`);

    const client = new window.ExcelEnergyAddin.OilPriceAPIClient(apiKey);
    const historicalData = await client.getPastYear(code);

    if (historicalData.length === 0) {
      showError('No historical data available');
      return;
    }

    // Create Historical sheet
    await window.ExcelEnergyAddin.createHistoricalSheet(code, historicalData, 'Past Year');

    showStatus(`✓ Successfully fetched ${historicalData.length} historical data points`);
    trackEvent('Historical Data Fetched', { commodity: code, period: 'past_year', count: historicalData.length });
  } catch (error) {
    // Check if upgrade required
    if (error.type === 'UPGRADE_REQUIRED') {
      showUpgradePrompt(error);
      trackEvent('Upgrade Required Shown', { feature: 'historical_data', commodity: code });
    } else if (error.type === 'RATE_LIMIT') {
      showError(error.userMessage);
      trackEvent('Rate Limit Hit', { feature: 'historical_data', commodity: code });
    } else {
      showError(error.userMessage || error.message);
      trackEvent('Error Occurred', { error: 'Historical Fetch Failed' });
    }
  }
}

/**
 * Fetch past month of historical data
 */
async function fetchPastMonth() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('Please enter and save your API key first');
    return;
  }

  const select = document.getElementById('historical-commodity');
  const code = select?.value;

  if (!code) {
    showError('Please select a commodity');
    return;
  }

  try {
    showStatus(`Fetching past month for ${code}...`);

    const client = new window.ExcelEnergyAddin.OilPriceAPIClient(apiKey);
    const historicalData = await client.getPastMonth(code);

    if (historicalData.length === 0) {
      showError('No historical data available');
      return;
    }

    // Create Historical sheet
    await window.ExcelEnergyAddin.createHistoricalSheet(code, historicalData, 'Past Month');

    showStatus(`✓ Successfully fetched ${historicalData.length} historical data points`);
    trackEvent('Historical Data Fetched', { commodity: code, period: 'past_month', count: historicalData.length });
  } catch (error) {
    // Check if upgrade required
    if (error.type === 'UPGRADE_REQUIRED') {
      showUpgradePrompt(error);
      trackEvent('Upgrade Required Shown', { feature: 'historical_data', commodity: code });
    } else if (error.type === 'RATE_LIMIT') {
      showError(error.userMessage);
      trackEvent('Rate Limit Hit', { feature: 'historical_data', commodity: code });
    } else {
      showError(error.userMessage || error.message);
      trackEvent('Error Occurred', { error: 'Historical Fetch Failed' });
    }
  }
}

/**
 * Show upgrade prompt modal
 */
function showUpgradePrompt(error) {
  const message = `${error.userMessage}\n\n${error.recoveryAction}`;

  const shouldUpgrade = confirm(message + '\n\nClick OK to view upgrade options.');

  if (shouldUpgrade) {
    window.open('https://www.oilpriceapi.com/pricing', '_blank');
    trackEvent('Upgrade Clicked', { source: 'upgrade_prompt' });
  }
}
