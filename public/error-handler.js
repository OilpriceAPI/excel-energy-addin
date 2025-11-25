/**
 * Enhanced Error Display Handler
 */

function showEnhancedError(error) {
  const errorEl = document.getElementById('error-message');
  const statusEl = document.getElementById('status-message');
  
  if (statusEl) {
    statusEl.className = 'status-message';
  }
  
  if (!errorEl) return;
  
  const errorType = error.type || 'UNKNOWN';
  const userMessage = error.userMessage || error.message || 'An unexpected error occurred.';
  const recoveryAction = error.recoveryAction;
  
  let errorHTML = `
    <div class='error-header'>
      <span class='error-icon'>⚠️</span>
      <span class='error-title'>${getErrorTitle(errorType)}</span>
    </div>
    <div class='error-body'>${userMessage}</div>
  `;
  
  if (recoveryAction) {
    errorHTML += `
      <div class='error-recovery'>
        <div class='error-recovery-title'>How to fix this:</div>
        <div class='error-recovery-text'>${recoveryAction}</div>
        <div class='error-actions'>
          ${getRecoveryButtons(errorType)}
          <button class='btn-dismiss' onclick='hideError()'>Dismiss</button>
        </div>
      </div>
    `;
  }
  
  errorEl.innerHTML = errorHTML;
  errorEl.className = 'error-message visible';
}

function getErrorTitle(errorType) {
  const titles = {
    'AUTHENTICATION': 'Authentication Failed',
    'RATE_LIMIT': 'Rate Limit Exceeded',
    'NOT_FOUND': 'Resource Not Found',
    'SERVER_ERROR': 'Server Error',
    'NETWORK_ERROR': 'Connection Error',
    'INVALID_RESPONSE': 'Invalid Response',
    'UNKNOWN': 'Error'
  };
  return titles[errorType] || 'Error';
}

function getRecoveryButtons(errorType) {
  switch (errorType) {
    case 'AUTHENTICATION':
      return `<button class='btn-fix' onclick='showSettings()'>Update API Key</button>`;
    case 'RATE_LIMIT':
      return `<button class='btn-fix' onclick="window.open('https://www.oilpriceapi.com/pricing', '_blank')">Upgrade Plan</button>`;
    case 'NETWORK_ERROR':
    case 'SERVER_ERROR':
      return `<button class='btn-fix' onclick='retryLastAction()'>Try Again</button>`;
    default:
      return `<button class='btn-fix' onclick='retryLastAction()'>Retry</button>`;
  }
}

function hideError() {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.className = 'error-message';
  }
}

function showSettings() {
  hideError();
  const settingsSection = document.querySelector('.settings-section');
  if (settingsSection) {
    settingsSection.scrollIntoView({ behavior: 'smooth' });
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
      apiKeyInput.focus();
      apiKeyInput.select();
    }
  }
}

function retryLastAction() {
  hideError();
  console.log('[Action] Retry requested');
}

function showError(message) {
  if (typeof message === 'object' && message.userMessage) {
    showEnhancedError(message);
  } else {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
      errorEl.innerHTML = `
        <div class='error-header'>
          <span class='error-icon'>⚠️</span>
          <span class='error-title'>Error</span>
        </div>
        <div class='error-body'>${message}</div>
        <div class='error-actions'>
          <button class='btn-dismiss' onclick='hideError()'>Dismiss</button>
        </div>
      `;
      errorEl.className = 'error-message visible';
    }
  }
}

if (typeof window !== 'undefined') {
  window.showEnhancedError = showEnhancedError;
  window.showError = showError;
  window.hideError = hideError;
  window.showSettings = showSettings;
  window.retryLastAction = retryLastAction;
}
