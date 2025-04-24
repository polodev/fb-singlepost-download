// Facebook Post Image Downloader - Popup Script

// This script will handle any interactions within the popup
document.addEventListener('DOMContentLoaded', function() {
  // Get current tab to check if we're on Facebook
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;
    
    // Update status message based on if we're on Facebook or not
    const statusElement = document.querySelector('.status');
    
    if (url.includes('facebook.com')) {
      statusElement.textContent = 'Active on Facebook - Ready to download images';
      statusElement.style.color = '#3578e5';
    } else {
      statusElement.textContent = 'Not on Facebook - Please visit Facebook to use this extension';
      statusElement.style.color = '#999';
    }
  });
});
