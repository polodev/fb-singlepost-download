// Facebook Post Image Downloader - Background Script

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadImages') {
    console.log('Background received request to download images:', message.images);
    downloadImages(message.images);
    // Send response back to confirm received
    sendResponse({status: 'downloading', count: message.images.length});
    return true; // Keep the message channel open for the async response
  }
});

// Function to download images
function downloadImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    console.error('No image URLs provided for download');
    return;
  }
  
  console.log('Starting download of', imageUrls.length, 'images');
  
  // Create a timestamp for folder organization
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  
  // Process image URLs to ensure they're fully qualified
  const processedUrls = imageUrls.map(url => {
    // Handle relative URLs
    if (url.startsWith('/')) {
      return 'https://www.facebook.com' + url;
    }
    
    // Handle data-src attributes that might contain encoded URLs
    if (url.includes('https%3A')) {
      try {
        return decodeURIComponent(url);
      } catch(e) {
        console.error('Error decoding URL:', e);
        return url;
      }
    }
    
    return url;
  }).filter(url => url && (url.startsWith('http') || url.startsWith('https')));
  
  console.log('Processed URLs:', processedUrls);
  
  // Download each image
  processedUrls.forEach((url, index) => {
    // Extract file extension from URL
    const fileExtension = url.split('?')[0].split('.').pop() || 'jpg';
    
    // Create a filename with timestamp and index
    const filename = `facebook_${timestamp}/image_${index + 1}.${fileExtension}`;
    
    // Use Chrome's download API
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError, 'for URL:', url);
      } else {
        console.log('Download started with ID:', downloadId, 'for URL:', url);
      }
    });
  });
}
