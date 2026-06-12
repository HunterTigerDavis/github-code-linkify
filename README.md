# GitHub Code Linkify

[![GitHub version](https://shields.io)](https://github.com/HunterTigerDavis/github-code-linkify)

A lightweight, high-performance Chrome extension that enhances GitHub browsing by providing instant plaintext URL highlighting and click functionality directly on code lines in pull requests, commits, and code blobs.

## 🚀 Features

- **Isolated URL Highlighting:** Automatically highlights plaintext URLs or commented references inside code lines when hovering over them. Uses the modern CSS Custom Highlight API to style *only* the specific URL text sequence without altering your code's native syntax highlighting or breaking copy-paste layout formatting.
- **Click-to-Open (Virtual DOM Safe):** Click on highlighted URLs to instantly open them in a new tab. Completely bypasses destructive structural `.innerHTML` updates, preventing GitHub's dynamic React/Turbo engine from throwing rendering crashes or overwriting elements during page scrolls.
- **Persistent Aggregate History:** Automatically captures and logs clicked references in a secure local browser database, allowing you to view your links cleanly grouped by base site domain inside the extension popup window.
- **Smart Dual-Badge Feedback:** Monitors active tab context to render a high-visibility alert (`!`) when browsing an active, relevant GitHub page, and seamlessly transitions to a numeric uBlock-style counter showing reference frequency when visiting your redirected destinations.
- **Cross-View Support:** Activates seamlessly across multiple complex GitHub layout structures without breaking internal page routing.

## 📁 Supported GitHub Views

✅ The extension selectively targets and activates on the following GitHub environments:
- **Pull Request pages** (`/pull/`)
- **Commit pages** (`/commit/`)

⚠️ Current Work in Progress:
- **Code blob views** (`/blob/`)
- **Files changed / Files modified views** (`/changes/`)

## 🛠️ Installation

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the root project extension directory containing your `manifest.json`.

## ⚙️ How It Works

The extension splits its logic between independent architecture layers to bypass GitHub's virtual layout constraints:
- **`content.js`** — Tacks a lightweight `document.elementFromPoint` listener onto your cursor coordinates to flatten fragmented code nodes into single cohesive string lines on-demand. If it mathematically intersects a URL, it flags the browser's separate visual layer.
- **`background.js`** — Listens for script transmissions to safely commit URLs to the background `chrome.storage.local` database and commands the active tab's layout badge layout.
- **`popup.html` & `script.js`** — Reads the saved historical array on-click, extracts the URL hostnames, strips out standard `www.` subdomains, and draws them as clear bulleted lists organized alphabetically by site.

Visible URLs inside code views or comments without hyperlink identifiers such as 
`https://github.com/HunterTigerDavis/github-code-linkify`
Will be 

## 🛠️ Development & Contributing

To contribute or modify the extension framework locally:
1. Make structural tracking changes inside `content.js` or data-handling updates inside `background.js`.
2. Reload the extension inside your `chrome://extensions/` control window.
3. Open Developer Tools (`F12`) on a target GitHub diff workspace to monitor execution.

## 📄 License

This project is open-source and distributed under the [MIT License](./LICENSE).
