# GitHub Code Linkify

[![Extension version](./icons/version-badge.svg)](https://github.com/HunterTigerDavis/github-code-linkify)

GitHub Code Linkify makes plaintext URLs inside GitHub code and review pages behave like links. Hover over a  URL to highlight it, then click to open it in a new tab and save it to the extension's local history.

## 🚀 Features

- Highlights only the URL text under the pointer using the CSS Custom Highlight API.
- Opens plaintext URLs without rewriting GitHub's DOM or disrupting its React interface.
- Saves clicked URLs locally and groups them by hostname in the popup.
- Shows an action badge for code-aware pages and a count for saved links on other sites.
- Provides quick settings in the popup and a full options page for detailed configuration.
- Supports custom aware sites and URL keywords.
- Supports dark mode, automatic popup scanning, badge visibility, and separate base-URL and keyword checks.

## 📁 Current page support

The content script is currently injected on GitHub pages and recognizes these page patterns by default:

- Pull requests: `/pull/`
- Commits: `/commit/`
- Code views: `/blob/`
- Comparisons: `/compare/`
- Changes: `/changes/`
- Wikis: `/wiki/`
- Issues: `/issues`
- Discussions: `/discussions`

Custom sites and keywords can be managed from **Settings > Advanced settings**. The extension must be injected on a site for content highlighting to run there; the current manifest targets GitHub pages.

## 🛠️ Installation

<small> Installation works on all major browsers, including Edge, Safari, and Brave. Typing `chrome://extensions` in a Chromium-based browser will direct you to that browser's extensions page.</small>

1. Clone or download this repository:
	- Command line/Terminal: ```git clone https://github.com/HunterTigerDavis/github-code-linkify```
	- If downloading as ZIP, extract files to a new folder.
3. Open your browser's extensions page, either:
    - Open `chrome://extensions/` in search bar 
	- Click the extension icon in the browser bar, or open it through the browser settings.
4. Enable **Developer mode** toggle to allow local extension installation.
5. Select **Load unpacked**.
6. Choose the project folder containing `manifest.json` (default: github-code-linkify).
7. Open the extension popup and use the gear menu for quick settings or **Advanced settings** for the full configuration page.
8. Pin the extension to browser for ease of use & activity badge.

## ⚙️ Using the extension

1. Open a supported GitHub page.
2. Move the pointer over plaintext URLs in code or review content.
3. Click a highlighted URL to open it in a new tab.
4. Open the popup to review saved links grouped by site.
5. Use the popup's **Add current site to awareness** action to add the active hostname.
6. Use the options page to add, remove, or clear aware sites and keywords.

## 💾 Settings and data

***DATA PRIVACY: Your personal data is never saved or sold from this extension. All data is saved locally on your browser and never sold to 3rd parties.***

Settings are managed centrally by `settings.js` and stored as separate `chrome.storage.local` keys:

- `autoScanOnOpen`
- `darkMode`
- `showBadge`
- `enableBaseUrlCheck`
- `enableKeywordCheck`
- `awareBaseUrls`
- `awareKeywords`

The popup and options page both use the shared settings API. The content script reads the same values when deciding whether the current page is code-aware. `chrome.storage.onChanged` keeps active extension contexts synchronized.

Clicked URL history is stored separately under `clickedUrls`. It can be cleared entirely from the popup or by hostname in the popup's saved-link groups.

## 🧩 Project structure

- `manifest.json` - MV3 extension manifest, permissions, entry points, and options-page registration.
- `background.js` - service worker for tab badges and saving clicked URLs.
- `content.js` - URL detection, highlighting, and click handling on supported pages.
- `settings.js` - shared defaults, normalization, storage, and change listeners.
- `popup.html`, `popup.css`, `popup.js` - popup history, quick settings, and scan controls.
- `options.html`, `options.css`, `options.js` - advanced settings UI for toggles, sites, and keywords.
- `icons/` - extension icons and the generated version badge.

## 🛠️ Development

After changing extension code or the manifest:

1. Reload the extension from `chrome://extensions/`.
2. Refresh the target GitHub page after changing `content.js` or `settings.js`.
3. Reopen the popup or options page after changing their scripts or styles.
4. Use the service worker and page DevTools consoles to inspect extension logs.

The project uses `pnpm` for version synchronization. The `patch`, `minor`, and `major` scripts update the package version, manifest version, and generated version badge.

## 📄 License

This project is open-source and distributed under the [MIT License](./LICENSE).
