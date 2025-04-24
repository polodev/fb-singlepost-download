// Facebook Post Image Downloader - Content Script

// Configuration
const config = {
  buttonClass: 'fb-image-downloader-btn',
  buttonText: 'Download Images',
  buttonPosition: 'afterbegin', // 'afterbegin' to prepend, 'beforeend' to append
  postSelector: 'div[role="article"]', // Facebook post container selector
  imageSelector: 'img[data-visualcompletion="media-vc-image"]', // Facebook image selector
  observerConfig: { childList: true, subtree: true }, // MutationObserver config
  minImageWidth: 100, // Minimum width to consider an image for download (avoid icons)
};

// Main initialization function
function init() {
  console.log('Facebook Post Image Downloader initialized');
  
  // Add download buttons to existing posts
  addDownloadButtonsToExistingPosts();
  
  // Set up observer to handle dynamically loaded posts
  setupPostObserver();
}

// Add download buttons to existing posts on the page
function addDownloadButtonsToExistingPosts() {
  const posts = document.querySelectorAll(config.postSelector);
  posts.forEach(post => {
    if (!post.querySelector('.' + config.buttonClass)) {
      addDownloadButtonToPost(post);
    }
  });
}

// Add download button to a specific post
function addDownloadButtonToPost(post) {
  // Check if post has images
  const images = post.querySelectorAll(config.imageSelector);
  if (images.length === 0) return;
  
  // Find a suitable container for the button (usually the post actions area)
  const actionsBar = findActionsContainer(post);
  if (!actionsBar) return;
  
  // Create download button
  const downloadButton = document.createElement('div');
  downloadButton.className = config.buttonClass;
  downloadButton.innerHTML = `
    <span class="fb-image-download-icon">📥</span>
    <span class="fb-image-download-text">${config.buttonText}</span>
  `;
  
  // Add click event listener
  downloadButton.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    handleDownloadButtonClick(post);
  });
  
  // Add the button to the actions container
  actionsBar.insertAdjacentElement(config.buttonPosition, downloadButton);
}

// Find the actions container in a post (where Like, Comment, Share buttons are)
function findActionsContainer(post) {
  // This selector may need updates if Facebook changes their DOM
  const actionsSelectors = [
    'div[data-ad-comet-preview="message"] > div > div > div:last-child',
    'div[role="button"]', 
    'div.x1i10hfl'
  ];
  
  for (const selector of actionsSelectors) {
    const containers = post.querySelectorAll(selector);
    if (containers.length > 0) {
      // Return the parent of the first button container,
      // which is usually the actions bar
      return containers[0].parentElement;
    }
  }
  
  // Fallback: return the post itself so we can still add the button somewhere
  return post;
}

// Handle click on download button
function handleDownloadButtonClick(post) {
  // Get all images in the post
  const images = Array.from(post.querySelectorAll(config.imageSelector));
  
  // Filter images (avoid small icons)
  const validImages = images.filter(img => {
    return img.naturalWidth > config.minImageWidth;
  });
  
  if (validImages.length === 0) {
    alert('No valid images found in this post!');
    return;
  }
  
  // Extract image URLs
  const imageUrls = validImages.map(img => {
    return img.src || img.currentSrc;
  }).filter(url => url && url.startsWith('http'));
  
  // Send image URLs to background script for download
  chrome.runtime.sendMessage({ 
    action: 'downloadImages', 
    images: imageUrls 
  });
}

// Set up MutationObserver to watch for new posts
function setupPostObserver() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if any new posts were added
        mutation.addedNodes.forEach(node => {
          // Check if the node is an Element and might be a post or contain posts
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a post itself
            if (node.matches && node.matches(config.postSelector)) {
              addDownloadButtonToPost(node);
            } else {
              // Check if it contains posts
              const posts = node.querySelectorAll(config.postSelector);
              posts.forEach(post => {
                if (!post.querySelector('.' + config.buttonClass)) {
                  addDownloadButtonToPost(post);
                }
              });
            }
          }
        });
      }
    });
  });
  
  // Start observing the entire document
  observer.observe(document.body, config.observerConfig);
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
