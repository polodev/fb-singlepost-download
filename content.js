// Facebook Post Image Downloader - Content Script

// Configuration
const config = {
  buttonClass: 'fb-image-downloader-btn',
  buttonText: 'Download Images',
  buttonPosition: 'afterbegin', // 'afterbegin' to prepend, 'beforeend' to append
  // Multiple post selectors to handle different Facebook layouts
  postSelectors: [
    // Standard Facebook article container
    'div[role="article"]', 
    // Main feed posts with class combinations that indicate a full post
    '.x1lliihq:not(.x1n2onr6)',
    '.x1yztbdb:not([role="button"])',
    // From dummy content example
    '.html-div.xdj266r',
    // Most reliable indicators of post containers with images
    '.x78zum5.xdt5ytf',
    '.x1n2onr6.x1ja2u2z:not([role="button"])',
    // Post containers with engagement tools (likes, comments)
    'div[aria-labelledby][aria-describedby]'
  ],
  // IMPROVED: Selectors for finding images within posts
  imageSelectors: [
    // Facebook's main image classes
    'img.x1ey2m1c',
    'img.xz74otr',
    // Images with visual completion attribute
    'img[data-visualcompletion="media-vc-image"]',
    // Other Facebook image classes
    'img.x5yr21d',
    'img.xt7dq6l',
    'img.xu3j5b3',
    // General image selectors for any post
    '.x78zum5 img', // Images inside main containers
    '.x1n2onr6 img', // Images inside standard layout containers
    // Media containers with large images
    '.x9f619 img',
    '.x1y1aw1k img'
  ],
  observerConfig: { childList: true, subtree: true }, // MutationObserver config
  minImageWidth: 100, // Minimum width to consider an image for download (avoid icons)
};

// Debug helper function to find all potential posts
function debugFindAllPotentialPosts() {
  console.log('Debugging - looking for all potential posts...');
  
  // Try each selector individually
  config.postSelectors.forEach(selector => {
    const posts = document.querySelectorAll(selector);
    console.log(`Selector '${selector}' found ${posts.length} potential posts`);
  });
}

// Main initialization function
function init() {
  console.log('Facebook Post Image Downloader Extension initialized');
  
  // Run debug to see what we're finding (temporary)
  debugFindAllPotentialPosts();
  
  // Add download buttons to existing posts
  addDownloadButtonsToExistingPosts();
  
  // Set up observer to watch for new posts
  setupPostObserver();
  
  // Add helpful console message for users
  console.log('Facebook Image Downloader is ready. Look for Download Images buttons on posts.');
}

// Add download buttons to existing posts on the page
function addDownloadButtonsToExistingPosts() {
  // Try each post selector
  config.postSelectors.forEach(selector => {
    const posts = document.querySelectorAll(selector);
    posts.forEach(post => {
      if (!post.querySelector('.' + config.buttonClass)) {
        addDownloadButtonToPost(post);
      }
    });
  });
}

// Add download button to a specific post
function addDownloadButtonToPost(post) {
  // Only process real posts, not small UI elements
  if (post.clientWidth < 200 || post.clientHeight < 100) {
    return;
  }
  
  // Check if post has multiple images using selectors
  let imageCount = 0;
  
  // Try each image selector
  for (const selector of config.imageSelectors) {
    imageCount += post.querySelectorAll(selector).length;
    // If we've found enough images, no need to check more selectors
    if (imageCount >= 2) break;
  }
  
  // Also count all img tags if we haven't found much
  if (imageCount < 2) {
    const allImgTags = post.querySelectorAll('img');
    // Filter out tiny images (likely icons)
    const potentialContentImages = Array.from(allImgTags).filter(img => {
      const width = img.naturalWidth || img.width || img.clientWidth || 0;
      const height = img.naturalHeight || img.height || img.clientHeight || 0;
      return (width >= config.minImageWidth && height >= config.minImageWidth);
    });
    
    imageCount = potentialContentImages.length;
  }
  
  // Only add button if post has multiple images (at least 2)
  if (imageCount < 1) {
    return;
  }
  
  // Find a suitable container for the button
  const actionsBar = findActionsContainer(post);
  if (!actionsBar) return;
  
  // Create download button
  const downloadButton = document.createElement('div');
  downloadButton.className = config.buttonClass;
  downloadButton.innerHTML = `
    <span class="fb-image-download-icon">📥</span>
    <span class="fb-image-download-text">${config.buttonText}</span>
  `;
  
  // Add inline styles to make button more visible
  downloadButton.style.display = 'inline-flex';
  downloadButton.style.alignItems = 'center';
  downloadButton.style.cursor = 'pointer';
  downloadButton.style.padding = '6px 12px';
  downloadButton.style.margin = '5px';
  downloadButton.style.borderRadius = '6px';
  downloadButton.style.backgroundColor = '#3578e5';
  downloadButton.style.color = 'white';
  downloadButton.style.fontWeight = 'bold';
  downloadButton.style.zIndex = '9999';
  
  // Add click event listener
  downloadButton.addEventListener('click', function(event) {
    event.preventDefault();
    event.stopPropagation();
    handleDownloadButtonClick(post);
  });
  
  // Only add the button if it definitely doesn't exist yet
  if (!actionsBar.querySelector('.' + config.buttonClass)) {
    actionsBar.insertAdjacentElement(config.buttonPosition, downloadButton);
    console.log('Added download button to post');
  }
}

// Find the actions container in a post (where Like, Comment, Share buttons are)
function findActionsContainer(post) {
  // Extended selectors for various Facebook layouts
  const actionsSelectors = [
    // Standard Facebook selectors
    'div[data-ad-comet-preview="message"] > div > div > div:last-child',
    'div[role="button"]', 
    'div.x1i10hfl',
    // Selectors from the dummy content example
    '.xqcrz7y.x78zum5.x1qx5ct2.x1y1aw1k',
    '.x9f619.x1n2onr6.x1ja2u2z.x78zum5',
    '.x6s0dn4.xi81zsa.x78zum5',
    // Content areas where we might want to insert our button
    '.x1l90r2v.x1iorvi4.x1ye3gou',
    '.x78zum5.xdt5ytf',
    // Headers or top sections where button placement would be visible
    '.html-div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1iyjqo2.xeuugli'
  ];
  
  // First try to find specific action containers
  for (const selector of actionsSelectors) {
    const containers = post.querySelectorAll(selector);
    if (containers.length > 0) {
      return containers[0].parentElement || containers[0];
    }
  }
  
  // If no specific action containers found, find any div containing interaction elements
  const interactionElements = post.querySelectorAll('button, [role="button"], a[role="link"]');
  if (interactionElements.length > 0) {
    return interactionElements[0].parentElement || interactionElements[0];
  }
  
  // Fallback: return the first child div or the post itself
  const firstChildDiv = post.querySelector('div');
  return firstChildDiv || post;
}

// Handle click on download button
function handleDownloadButtonClick(post) {
  // Find the closest parent that looks like a post container if we don't have the full post
  if (!post.matches(config.postSelectors.join(','))) {
    let parent = post.parentElement;
    while (parent && !parent.matches(config.postSelectors.join(','))) {
      parent = parent.parentElement;
      // If we go too high up the DOM, stop
      if (parent === document.body) {
        parent = null;
        break;
      }
    }
    if (parent) post = parent;
  }
  
  console.log('Download button clicked for post:', post);
  
  // Visual feedback immediately (before processing)
  const clickedButton = post.querySelector('.' + config.buttonClass);
  if (clickedButton) {
    clickedButton.style.backgroundColor = '#e69500'; // Processing color
    clickedButton.innerText = 'Processing...';
  }
  
  // Get all images in the post using all selectors
  let images = [];
  
  // First pass - try to get all images
  for (const selector of config.imageSelectors) {
    const foundImages = post.querySelectorAll(selector);
    console.log(`Found ${foundImages.length} images with selector: ${selector}`);
    if (foundImages.length > 0) {
      images = [...images, ...Array.from(foundImages)];
    }
  }
  
  // Second pass - also look for all img tags if we didn't find many images
  if (images.length < 2) {
    const allImages = post.querySelectorAll('img');
    console.log(`Found ${allImages.length} images with generic img selector`);
    images = [...images, ...Array.from(allImages)];
  }
  
  console.log('Total images found before filtering:', images.length);
  
  // Remove duplicates by src attribute
  const uniqueImages = [];
  const seenSrcs = new Set();
  
  images.forEach(img => {
    const src = img.src || img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !seenSrcs.has(src)) {
      seenSrcs.add(src);
      uniqueImages.push(img);
    }
  });
  
  console.log('Unique images:', uniqueImages.length);
  
  // Look for various image attributes
  let imageUrls = [];
  
  // Process each image element to extract URLs
  uniqueImages.forEach(img => {
    // Check various attributes where image URLs might be found
    const src = img.src || img.currentSrc || '';
    const dataSrc = img.getAttribute('data-src') || '';
    const srcset = img.getAttribute('srcset') || '';
    const dataSrcset = img.getAttribute('data-srcset') || '';
    const style = img.getAttribute('style') || '';
    
    // Check if any parent elements have background images
    let parent = img.parentElement;
    let backgroundImage = '';
    for (let i = 0; i < 3 && parent; i++) { // Check up to 3 parent levels
      const style = window.getComputedStyle(parent).backgroundImage;
      if (style && style !== 'none') {
        backgroundImage = style.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
        break;
      }
      parent = parent.parentElement;
    }
    
    // Extract the largest image from srcset if available
    let largestFromSrcset = '';
    if (srcset || dataSrcset) {
      const srcsetStr = srcset || dataSrcset;
      const srcsetParts = srcsetStr.split(',');
      let maxWidth = 0;
      
      srcsetParts.forEach(part => {
        const [url, width] = part.trim().split(' ');
        if (url && width) {
          const numWidth = parseInt(width.replace('w', ''));
          if (numWidth > maxWidth) {
            maxWidth = numWidth;
            largestFromSrcset = url;
          }
        }
      });
    }
    
    // Extract URL from inline style if present
    let styleUrl = '';
    if (style && style.includes('url(')) {
      styleUrl = style.replace(/.*url\(['"]?(.*?)['"]?\).*/, '$1');
    }
    
    // Prioritize sources by likely quality
    const possibleUrls = [
      largestFromSrcset,
      dataSrc,
      src,
      backgroundImage,
      styleUrl
    ].filter(url => url && url.trim() !== '');
    
    if (possibleUrls.length > 0) {
      imageUrls.push(possibleUrls[0]); // Add the highest priority URL
    }
  });
  
  // Also look for links that might point to full-size images
  const links = post.querySelectorAll('a');
  links.forEach(link => {
    const href = link.href || link.getAttribute('href') || '';
    if (href && (href.match(/\.(jpeg|jpg|png|gif|webp)(\?|$)/) || href.includes('fbcdn.net'))) {
      imageUrls.push(href);
    }
  });
  
  // Remove duplicates again
  imageUrls = [...new Set(imageUrls)];
  
  // Filter out small images and non-http URLs
  imageUrls = imageUrls.filter(url => {
    return url && (url.startsWith('http') || url.startsWith('https') || url.startsWith('/'));
  });
  
  console.log('Image URLs found:', imageUrls);
  
  if (imageUrls.length === 0) {
    alert('No valid images found in this post!');
    return;
  }
  
  // Send image URLs to background script for download
  chrome.runtime.sendMessage({ 
    action: 'downloadImages', 
    images: imageUrls 
  }, response => {
    console.log('Background script response:', response);
  });
  
  // Visual feedback
  if (clickedButton) {
    const originalColor = clickedButton.style.backgroundColor;
    clickedButton.style.backgroundColor = '#4BB543'; // Success green
    clickedButton.innerText = 'Downloading...';
    
    setTimeout(() => {
      clickedButton.style.backgroundColor = originalColor;
      clickedButton.innerHTML = `
        <span class="fb-image-download-icon">📥</span>
        <span class="fb-image-download-text">${config.buttonText}</span>
      `;
    }, 2000);
  }
}

// Set up MutationObserver to watch for new posts
function setupPostObserver() {
  // Keep track of nodes we've already processed to prevent duplicates
  const processedNodes = new WeakSet();
  
  const observer = new MutationObserver(mutations => {
    // Flag to track if we need to process posts
    let needsPostProcessing = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        needsPostProcessing = true;
      }
    });
    
    // If mutations indicate new content, process all posts after a short delay
    // This helps batch multiple mutations together
    if (needsPostProcessing) {
      setTimeout(() => {
        // Find all posts
        config.postSelectors.forEach(selector => {
          const posts = document.querySelectorAll(selector);
          posts.forEach(post => {
            // Only process if we haven't already processed this node
            if (!processedNodes.has(post) && !post.querySelector('.' + config.buttonClass)) {
              addDownloadButtonToPost(post);
              processedNodes.add(post);
            }
          });
        });
      }, 500); // Small delay to batch mutations
    }
  });
  
  // Start observing the entire document
  observer.observe(document.body, config.observerConfig);
  
  // Also run a check every few seconds for posts that might have been missed
  setInterval(() => {
    addDownloadButtonsToExistingPosts();
  }, 3000);
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
