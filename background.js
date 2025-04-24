// Facebook Post Image Downloader - Background Script

// Track downloads in progress
let activeDownloads = 0;
let totalImageCount = 0;
let completedImageCount = 0;
let currentBatch = 0;
let totalBatches = 0;

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadImages') {
    // Log batch information if provided
    if (message.batchNumber && message.totalBatches) {
      console.log(`Processing batch ${message.batchNumber} of ${message.totalBatches} with ${message.images.length} images`);
      currentBatch = message.batchNumber;
      totalBatches = message.totalBatches;
    } else {
      console.log(`Processing ${message.images.length} images`);
    }
    
    // Download the images
    downloadImages(message.images);
    
    // Send response back to confirm received
    sendResponse({
      status: 'downloading', 
      count: message.images.length,
      currentBatch: message.batchNumber || 1,
      totalBatches: message.totalBatches || 1
    });
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
  
  // Update global counters
  activeDownloads += imageUrls.length;
  totalImageCount += imageUrls.length;
  
  // Create a timestamp for folder organization
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  
  // Process image URLs to ensure they're fully qualified and clean up any issues
  const processedUrls = imageUrls.map(url => {
    try {
      // Clean the URL - remove escaped characters, etc.
      let cleanUrl = url;
      
      // Handle relative URLs
      if (cleanUrl.startsWith('/')) {
        cleanUrl = 'https://www.facebook.com' + cleanUrl;
      }
      
      // Handle encoded URLs
      if (cleanUrl.includes('%3A')) {
        try {
          cleanUrl = decodeURIComponent(cleanUrl);
        } catch(e) {
          console.error('Error decoding URL:', e);
        }
      }
      
      // Handle URLs with double http(s)
      if (cleanUrl.includes('https://https://') || cleanUrl.includes('http://http://')) {
        cleanUrl = cleanUrl.replace('https://https://', 'https://');
        cleanUrl = cleanUrl.replace('http://http://', 'http://');
      }
      
      // Remove any double-encoded parameters
      if (cleanUrl.includes('%253A')) {
        try {
          cleanUrl = decodeURIComponent(cleanUrl);
        } catch(e) {}
      }
      
      // Clean URL parameters (Facebook often adds tracking params)
      if (cleanUrl.includes('fbclid=')) {
        try {
          const urlObj = new URL(cleanUrl);
          urlObj.searchParams.delete('fbclid');
          cleanUrl = urlObj.toString();
        } catch(e) {}
      }
      
      return cleanUrl;
    } catch (e) {
      console.error('Error processing URL:', url, e);
      return url; // Return original if processing fails
    }
  }).filter(url => {
    // Only keep valid URLs
    try {
      return url && (url.startsWith('http') || url.startsWith('https'));
    } catch (e) {
      return false;
    }
  });
  
  // Remove duplicates
  const uniqueUrls = [...new Set(processedUrls)];
  console.log(`Processing ${uniqueUrls.length} unique URLs from ${processedUrls.length} total`);
  
  // Download each image
  uniqueUrls.forEach((url, index) => {
    try {
      // Try to extract a reasonable file extension
      let fileExtension = 'jpg'; // Default to jpg
      
      try {
        // Parse the URL path to get extension
        const urlPath = new URL(url).pathname;
        const urlExtension = urlPath.split('.').pop().toLowerCase();
        
        // Only accept common image extensions
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(urlExtension)) {
          fileExtension = urlExtension;
        }
      } catch (e) {}
      
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
          activeDownloads--;
          completedImageCount++;
        } else {
          console.log(`Download started: ${index + 1}/${uniqueUrls.length}, ID: ${downloadId}`);
          
          // Listen for download completion
          chrome.downloads.onChanged.addListener(function downloadListener(delta) {
            if (delta.id === downloadId && (delta.state?.current === 'complete' || delta.state?.current === 'interrupted')) {
              // Remove this listener once the download is finished
              chrome.downloads.onChanged.removeListener(downloadListener);
              activeDownloads--;
              completedImageCount++;
              
              // Log progress
              const progress = Math.round((completedImageCount / totalImageCount) * 100);
              console.log(`Download progress: ${completedImageCount}/${totalImageCount} (${progress}%)`);
              
              // If all downloads in this batch are complete, reset counters for next batch
              if (activeDownloads === 0 && currentBatch === totalBatches) {
                console.log('All downloads complete!');
                totalImageCount = 0;
                completedImageCount = 0;
                currentBatch = 0;
                totalBatches = 0;
              }
            }
          });
        }
      });
    } catch (e) {
      console.error('Error initiating download for URL:', url, e);
      activeDownloads--;
      completedImageCount++;
    }
  });
}
