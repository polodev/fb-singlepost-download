// Facebook Post Image Downloader - Background Script

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImages' && request.images && request.images.length > 0) {
    downloadImages(request.images);
    sendResponse({ status: 'download_started' });
    return true;
  }
});

// Download all images
function downloadImages(imageUrls) {
  // Create a folder name based on date and time
  const date = new Date();
  const folderPrefix = `fb_images_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}`;
  
  // Download each image
  imageUrls.forEach((url, index) => {
    // Create a filename for the downloaded image
    const filename = `${folderPrefix}_image_${(index + 1).toString().padStart(2, '0')}.jpg`;
    
    // Download the image
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });
  });
  
  // Log how many images are being downloaded
  console.log(`Downloading ${imageUrls.length} images...`);
}
