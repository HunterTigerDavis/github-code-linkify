# GitHub Link Clicker Extension

A Chrome extension that enhances GitHub browsing by providing URL highlighting and click functionality on code lines in pull requests, commits, and code blobs.

## Features

- **URL Highlighting**: Automatically highlights URLs in code lines when hovering over them
- **Click-to-Open**: Click on highlighted URLs to open them in a new tab
- **Cross-View Support**: Works across different GitHub views (PRs, commits, code blobs)
- **Smart Detection**: Only activates on relevant GitHub pages

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## How It Works

The extension injects a content script that:
- Detects when you're on GitHub pull request, commit, or code blob pages
- Listens for mouse movements to identify code lines containing URLs
- Applies visual highlighting to make URLs clickable
- Handles clicks to open URLs in new tabs without interfering with GitHub's normal behavior

## Supported GitHub Views

- Pull Request pages (`/pull/`)
- Commit pages (`/commit/`)
- Code blob pages (`/blob/`)
- Changes view (`/changes/`)

## Development

To contribute or modify the extension:

1. Make changes to `content.js`
2. Reload the extension in Chrome
3. Test the functionality on GitHub

## License

MIT