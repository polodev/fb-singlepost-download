// Facebook Post Image Downloader - Content Script

// Track if the extension is enabled (default to true)
let extensionEnabled = true;

// Configuration
const config = {
  buttonText: 'Download Images',
  buttonClass: 'fb-image-download-button',
  buttonPosition: 'afterbegin', // 'afterbegin' to prepend, 'beforeend' to append
  minImageWidth: 100, // Minimum width to consider as a real image (to filter out icons)
  minImageHeight: 100, // Minimum height to consider as a real image
  maxImagesToProcess: 1000, // Maximum number of images to process in a post
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
    // Images with visual completion attribute (these are reliable indicators of content images)
    'img[data-visualcompletion="media-vc-image"]',
    '[data-visualcompletion="media-vc-image"]',
    // Other Facebook image classes
    'img.x5yr21d',
    'img.xt7dq6l',
    'img.xu3j5b3',
    // Facebook media viewers and galleries
    '.x193iq5w img', // Media viewer images
    '.x1lliihq img', // Photo collections
    '.xh8yej3 img', // Photo gallery 
    '.x5yr21d img', // Carousel images
    // Special containers for albums and multi-image posts
    '[role="presentation"] img',
    '[role="dialog"] img',
    // General image selectors for any post
    '.x78zum5 img', // Images inside main containers
    '.x1n2onr6 img', // Images inside standard layout containers
    // Media containers with large images
    '.x9f619 img',
    '.x1y1aw1k img',
    // Very generic selectors as a last resort
    'a > img', // Images inside links
    '.x1rg5ohu img' // Another Facebook container class
  ],
  observerConfig: { childList: true, subtree: true }, // MutationObserver config
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
  
  // Check if extension is enabled in storage
  chrome.storage.sync.get(['enabled'], function(result) {
    extensionEnabled = result.enabled !== undefined ? result.enabled : true;
    console.log('Extension enabled state from storage:', extensionEnabled);
    
    if (extensionEnabled) {
      // Run debug to see what we're finding (temporary)
      debugFindAllPotentialPosts();
      
      // Add download buttons to existing posts
      addDownloadButtonsToExistingPosts();
      
      // Set up observer to watch for new posts
      setupPostObserver();
      
      // Add helpful console message for users
      console.log('Facebook Image Downloader is ready. Look for Download Images buttons on posts.');
    }
  });
  
  // Listen for enable/disable messages from popup
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'toggleEnabled') {
      extensionEnabled = message.enabled;
      console.log('Extension ' + (extensionEnabled ? 'enabled' : 'disabled'));
      
      if (extensionEnabled) {
        // Add buttons when enabled
        addDownloadButtonsToExistingPosts();
        setupPostObserver();
      } else {
        // Remove buttons when disabled
        removeAllDownloadButtons();
        disconnectObserver();
      }
      
      sendResponse({success: true});
    }
    return true;
  });
}

// Function to disconnect the observer
function disconnectObserver() {
  if (globalObserver) {
    globalObserver.disconnect();
    globalObserver = null;
  }
  
  // Clear interval if it exists
  if (window.downloadButtonsInterval) {
    clearInterval(window.downloadButtonsInterval);
    window.downloadButtonsInterval = null;
  }
}

// Function to remove all download buttons
function removeAllDownloadButtons() {
  const buttons = document.querySelectorAll('.' + config.buttonClass);
  buttons.forEach(button => button.remove());
  console.log(`Removed ${buttons.length} download buttons`);
}

// Add download buttons to existing posts on the page
function addDownloadButtonsToExistingPosts() {
  // Only proceed if extension is enabled
  if (!extensionEnabled) return;
  
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
      return (width >= config.minImageWidth && height >= config.minImageHeight);
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
  
  // First look for all potential gallery containers
  const galleryContainers = Array.from(post.querySelectorAll('.xh8yej3, [role="dialog"], .x193iq5w, [aria-label*="photo"]'));
  console.log('Found gallery containers:', galleryContainers.length);
  
  // Process gallery containers specially
  galleryContainers.forEach(container => {
    // Find all images in this container
    const galleryImages = container.querySelectorAll('img');
    console.log(`Found ${galleryImages.length} images in gallery container`);
    
    // Get all direct URL attributes on images
    galleryImages.forEach(img => {
      // Don't filter by size in galleries - we want all images
      const src = img.src || img.getAttribute('src') || '';
      const dataSrc = img.getAttribute('data-src') || '';
      const srcset = img.getAttribute('srcset') || '';
      
      if (src) {
        // Try to get high-res version by URL manipulation
        const highResSrc = src
          .replace(/_(s|t)\.(jpg|png|webp)/i, '_n.$2') // Replace small/thumbnail markers
          .replace(/\/p\d+x\d+\//i, '/p2048x2048/') // Increase resolution parameters
          .replace(/\?size=\d+/i, '?size=2048'); // Increase size parameters
        
        imageUrls.push(highResSrc);
      }
      
      if (dataSrc && dataSrc !== src) imageUrls.push(dataSrc);
      
      // Extract all urls from srcset
      if (srcset) {
        srcset.split(',').forEach(part => {
          const srcUrl = part.trim().split(/\s+/)[0];
          if (srcUrl) imageUrls.push(srcUrl);
        });
      }
    });
  });
  
  // Process each image element to extract URLs
  uniqueImages.forEach(img => {
    // Check if this image is in a gallery container
    const inGallery = img.closest('.xh8yej3') || img.closest('[role="dialog"]') || img.closest('.x193iq5w');
    
    // Skip tiny images (likely emoticons or UI elements) unless they're in a gallery
    const width = img.naturalWidth || img.width || img.clientWidth || 0;
    const height = img.naturalHeight || img.height || img.clientHeight || 0;
    if (!inGallery && width < config.minImageWidth && height < config.minImageHeight) {
      return; // Skip this image
    }
    
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
      
      // Try to extract all URLs from srcset, not just the largest
      const srcsetUrls = [];
      
      srcsetParts.forEach(part => {
        try {
          // Handle different srcset formats
          // Format: "url width" or "url size"
          const parts = part.trim().split(/\s+/);
          if (parts.length >= 2 && parts[0]) {
            const url = parts[0].trim();
            srcsetUrls.push(url);
            
            // Also keep track of the largest
            const descriptor = parts[1];
            if (descriptor.includes('w')) {
              const numWidth = parseInt(descriptor.replace('w', ''));
              if (numWidth > maxWidth) {
                maxWidth = numWidth;
                largestFromSrcset = url;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing srcset part:', part, e);
        }
      });
      
      // Add all srcset URLs to our collection
      srcsetUrls.forEach(url => {
        if (url) imageUrls.push(url);
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
  
  // Also look for links that might point to full-size images - more aggressively
  // First look in all links
  const links = post.querySelectorAll('a');
  links.forEach(link => {
    // Get both href and any data-attributes that might contain image URLs
    const href = link.href || link.getAttribute('href') || '';
    const allAttrs = Array.from(link.attributes)
      .filter(attr => attr.name.startsWith('data-') && attr.value.includes('http'))
      .map(attr => attr.value);
    
    // Special handling for links to Facebook photos
    if (href && (href.includes('/photos/') || href.includes('/photo.php'))) {
      console.log('Found link to Facebook photo:', href);
      // These links often contain gallery images
      
      // Look for image inside the link
      const imgInLink = link.querySelector('img');
      if (imgInLink) {
        const src = imgInLink.src || imgInLink.getAttribute('src') || '';
        if (src) {
          // Try to get high-res version by URL manipulation
          const highResSrc = src
            .replace(/_(s|t)\.(jpg|png|webp)/i, '_n.$2') // Replace small/thumbnail markers
            .replace(/\/p\d+x\d+\//i, '/p2048x2048/') // Increase resolution parameters
            .replace(/\?size=\d+/i, '?size=2048'); // Increase size parameters
          
          imageUrls.push(highResSrc);
        }
      }
      
      // Look for parent containers that might have more images
      let parent = link.parentElement;
      while (parent && parent !== post) {
        const containerImages = parent.querySelectorAll('img');
        if (containerImages.length > 1) {
          console.log(`Found container with ${containerImages.length} images related to photo link`);
          containerImages.forEach(img => {
            const src = img.src || img.getAttribute('src') || '';
            if (src) {
              // Try to get high-res version
              const highResSrc = src
                .replace(/_(s|t)\.(jpg|png|webp)/i, '_n.$2')
                .replace(/\/p\d+x\d+\//i, '/p2048x2048/')
                .replace(/\?size=\d+/i, '?size=2048');
              
              imageUrls.push(highResSrc);
            }
          });
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    // Check if href points to an image or Facebook CDN
    if (href && (href.match(/\.(jpeg|jpg|png|gif|webp)(\?|$)/) || 
                 href.includes('fbcdn.net') || 
                 href.includes('fbstatic') || 
                 href.includes('fbsbx.com'))) {
      imageUrls.push(href);
    }
    
    // Add any data-attributes that look like image URLs
    allAttrs.forEach(attr => {
      if ((attr.match(/\.(jpeg|jpg|png|gif|webp)(\?|$)/) || 
           attr.includes('fbcdn.net') || 
           attr.includes('fbstatic') || 
           attr.includes('fbsbx.com'))) {
        imageUrls.push(attr);
      }
    });
  });
  
  // Find all elements containing 'data-visualcompletion="media-vc-image"'
  // This is a reliable marker for Facebook media images
  const mediaElements = post.querySelectorAll('[data-visualcompletion="media-vc-image"]');
  console.log('Found media-vc-image elements:', mediaElements.length);
  
  mediaElements.forEach(el => {
    // Get all attributes that might contain image sources
    Array.from(el.attributes)
      .filter(attr => attr.value && attr.value.includes && attr.value.includes('http'))
      .forEach(attr => {
        console.log('Found image URL in attribute:', attr.name, attr.value);
        imageUrls.push(attr.value);
      });
      
    // Look for parent elements that might be part of a gallery
    let parent = el.parentElement;
    let foundGalleryContainer = false;
    
    // Try to find a parent container that might hold gallery navigation
    // (often up to 3-5 levels up from the media element)
    for (let i = 0; i < 5 && parent && !foundGalleryContainer; i++) {
      // Look for gallery navigation indicators (arrows, dots, etc.)
      const navigationElements = parent.querySelectorAll('[aria-label*="next"], [aria-label*="previous"], [role="button"][tabindex="0"]');
      
      if (navigationElements.length > 0) {
        console.log('Found potential gallery navigation elements:', navigationElements.length);
        foundGalleryContainer = true;
        
        // Look for any numeric indicators that might show total images in gallery
        const textElements = Array.from(parent.querySelectorAll('*')).filter(el => {
          const text = el.textContent && el.textContent.trim();
          return text && text.match(/\d+\s*\/\s*\d+/); // Pattern like "1 / 76"
        });
        
        if (textElements.length > 0) {
          const countMatch = textElements[0].textContent.trim().match(/\d+\s*\/\s*(\d+)/);
          if (countMatch && countMatch[1]) {
            const totalImages = parseInt(countMatch[1]);
            console.log(`Found gallery counter: ${textElements[0].textContent}, indicating ${totalImages} total images`);
            
            // If we have a high-res source for this image, try to extract a pattern for other images
            const currentSrc = el.src || el.getAttribute('src') || '';
            if (currentSrc && totalImages > 1) {
              // Many Facebook galleries use numbered URLs for sequential images
              // Try to derive a pattern from the current URL
              
              // Look for patterns like: image_123.jpg, where 123 might be replaceable with other numbers
              const numberMatch = currentSrc.match(/[_-](\d+)\.(jpe?g|png|webp|gif)/i);
              if (numberMatch) {
                const prefix = currentSrc.substring(0, numberMatch.index);
                const suffix = currentSrc.substring(numberMatch.index + numberMatch[0].length);
                const numDigits = numberMatch[1].length;
                const currentNum = parseInt(numberMatch[1]);
                
                // Generate URLs for other images in the sequence
                for (let num = 1; num <= totalImages; num++) {
                  if (num !== currentNum) {
                    const paddedNum = num.toString().padStart(numDigits, '0');
                    const constructedUrl = `${prefix}${paddedNum}${suffix}`;
                    console.log(`Constructed URL for image ${num}: ${constructedUrl}`);
                    imageUrls.push(constructedUrl);
                  }
                }
              }
            }
          }
        }
      }
      parent = parent.parentElement;
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
  
  // If too many images, warn the user
  if (imageUrls.length > 50) {
    if (!confirm(`This post contains ${imageUrls.length} images. Do you want to download all of them?`)) {
      if (clickedButton) {
        clickedButton.style.backgroundColor = '#888';
        clickedButton.innerText = 'Cancelled';
        setTimeout(() => {
          clickedButton.innerHTML = `
            <span class="fb-image-download-icon">📥</span>
            <span class="fb-image-download-text">${config.buttonText}</span>
          `;
          clickedButton.style.backgroundColor = '#3578e5';
        }, 2000);
      }
      return;
    }
  }
  
  // Log how many images we found
  console.log(`Sending ${imageUrls.length} images to download`);
  
  // Log what we found
  console.log(`Found total of ${imageUrls.length} image URLs before filtering duplicates`);
  
  // Remove duplicates again
  imageUrls = [...new Set(imageUrls)];
  console.log(`After removing duplicates: ${imageUrls.length} unique image URLs`);
  
  // Further filter to remove small or irrelevant images
  imageUrls = imageUrls.filter(url => {
    // Skip emoji and reaction images
    if (url.includes('emoji.php') || url.includes('reaction/image')) {
      return false;
    }
    
    // Skip small icon images (often used for UI)
    if (url.includes('icon') && url.includes('16x16')) {
      return false;
    }
    
    return true;
  });
  
  // Send image URLs to background script for download
  // Split into batches if there are many images to avoid overwhelming the browser
  const batchSize = 20;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    console.log(`Sending batch ${Math.floor(i / batchSize) + 1} with ${batch.length} images...`);
    
    chrome.runtime.sendMessage({ 
      action: 'downloadImages', 
      images: batch,
      batchNumber: Math.floor(i / batchSize) + 1,
      totalBatches: Math.ceil(imageUrls.length / batchSize)
    }, response => {
      console.log(`Batch ${Math.floor(i / batchSize) + 1} response:`, response);
    });
  }
  
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

// Global observer reference so we can disconnect it later
let globalObserver = null;

// Set up MutationObserver to watch for new posts
function setupPostObserver() {
  // Only set up if not already observing
  if (globalObserver) return;
  
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
  
  // Save reference to observer
  globalObserver = observer;
  
  // Also run a check every few seconds for posts that might have been missed
  if (!window.downloadButtonsInterval) {
    window.downloadButtonsInterval = setInterval(() => {
      if (extensionEnabled) {
        addDownloadButtonsToExistingPosts();
      }
    }, 3000);
  }
}

// Initialize when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
