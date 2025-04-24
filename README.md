# Facebook Post Image Downloader

A Chrome extension that adds a download button to Facebook posts, allowing users to download all images from a single post.

## Features

- Adds a "Download Images" button to Facebook posts containing images
- Downloads all images from a post with a single click
- Automatically names files with date and sequence number
- Works on Facebook News Feed, Profile pages, and Groups

## Installation Instructions

Since this extension is not published on the Chrome Web Store, you need to install it in Developer Mode:

1. Download or clone this repository to your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension should now be installed and active

## How to Use

1. Visit Facebook in your Chrome browser
2. Browse through your feed or any Facebook page
3. For any post containing images, you will see a blue "Download Images" button
4. Click the button to download all images from that post
5. Images will be saved to your default downloads folder with names like `fb_images_YYYY-MM-DD_HH-MM-SS_image_01.jpg`

## Customization

You can customize the extension by modifying the following files:
- `manifest.json`: Extension configuration
- `content.js`: The main script that adds download buttons to posts
- `styles.css`: Styling for the download button
- `background.js`: Background script that handles the actual downloading

## Permissions

This extension requires the following permissions:
- `activeTab`: To access the current tab's content
- `downloads`: To download images

## Troubleshooting

If the download button doesn't appear:
- Make sure the extension is enabled
- Try refreshing the Facebook page
- Facebook may have changed their page structure, requiring an update to the extension

## Notes

- This extension works with Facebook's current DOM structure (as of April 2025)
- Facebook may change their website structure in the future, which could break this extension
- The extension only downloads images, not videos
