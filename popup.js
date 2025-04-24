// Facebook Post Image Downloader - Popup Script

// This script will handle any interactions within the popup
document.addEventListener('DOMContentLoaded', function() {
  const toggleElement = document.getElementById('extensionToggle');
  const toggleStatusElement = document.getElementById('toggleStatus');
  const statusElement = document.querySelector('.status');
  
  // Load the current enabled state from storage
  chrome.storage.sync.get(['enabled'], function(result) {
    // Default to enabled if not set
    const enabled = result.enabled !== undefined ? result.enabled : true;
    toggleElement.checked = enabled;
    toggleStatusElement.textContent = enabled ? 'ON' : 'OFF';
    
    // Update status message
    updateStatus(enabled);
  });
  
  // Handle toggle changes
  toggleElement.addEventListener('change', function() {
    const enabled = toggleElement.checked;
    toggleStatusElement.textContent = enabled ? 'ON' : 'OFF';
    
    // Update status message
    updateStatus(enabled);
    
    // Save to storage
    chrome.storage.sync.set({enabled: enabled});
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('facebook.com')) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleEnabled', enabled: enabled});
      }
    });
  });
  
  // Function to update status message
  function updateStatus(enabled) {
    // Get current tab to check if we're on Facebook
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = currentTab ? currentTab.url : '';
      
      if (url && url.includes('facebook.com')) {
        if (enabled) {
          statusElement.textContent = 'Active on Facebook - Ready to download images';
          statusElement.style.color = '#3578e5';
        } else {
          statusElement.textContent = 'Disabled on Facebook - Toggle ON to use';
          statusElement.style.color = '#999';
        }
      } else {
        statusElement.textContent = 'Not on Facebook - Please visit Facebook to use this extension';
        statusElement.style.color = '#999';
      }
    });
  }
});
