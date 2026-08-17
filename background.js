const defaultSettings = {
  autoScanOnOpen: true,
  darkMode: false,
  showBadge: true
};

function getExtensionSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionSettings'], (result) => {
      const settings = { ...defaultSettings, ...(result.extensionSettings || {}) };
      chrome.storage.local.set({ extensionSettings: settings });
      resolve(settings);
    });
  });
}

function writeExtensionMeta() {
  const manifest = chrome.runtime.getManifest();

  const meta = {
    version: manifest.version ?? '',
    name: manifest.name ?? 'Github Code Linkify',
    description: manifest.description ?? '',
    repositoryUrl: manifest.homepage_url ?? ''
  };

  chrome.storage.local.set({ extensionMeta: meta });
  return meta;
}

function readExtensionMeta() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionMeta'], (result) => {
      const cached = result.extensionMeta;
      if (cached && cached.version) {
        resolve(cached);
        return;
      }
      resolve(writeExtensionMeta());
    });
  });
}

// background listener for popup & content script requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getExtensionMeta') {
    readExtensionMeta().then((meta) => {
      sendResponse({ meta });
    });
    return true;
  }

  if (message.type === 'refreshExtensionMeta') {
    const meta = writeExtensionMeta();
    sendResponse({ meta, ok: true });
    return true;
  }

  if (message.action === 'refreshBadgeState') {
    const tabUrl = message.url || '';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [tab] = tabs;
      if (tab && tab.id && tabUrl) {
        updateTabBadge(tab.id, tabUrl);
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});

readExtensionMeta();

chrome.runtime.onInstalled.addListener(() => {
  // Sync the extension metadata to local storage on install
  writeExtensionMeta();
  // open chrome extension popup on install
  chrome.action.openPopup().catch(() => { });
  console.log("Extension loaded, popup triggered");
});

chrome.runtime.onStartup.addListener(() => {
  readExtensionMeta();
});

// Helper function to dynamically manage badges safely with promise error suppression
function updateTabBadge(tabId, urlString) {
  if (!urlString) return;

  chrome.storage.local.get(['extensionSettings'], async (result) => {
    const settings = { ...defaultSettings, ...(result.extensionSettings || {}) };

    if (!settings.showBadge) {
      chrome.action.setBadgeText({ text: '', tabId }).catch(() => { });
      return;
    }

    const url = urlString.toLowerCase();
    const gitSites = ['github.com', 'gitlab.com', 'bitbucket.org', 'azure.com/repos', 'azure.com/git'];

    if (gitSites.some(site => url.includes(site))) {
      chrome.action.setBadgeText({ text: "!", tabId }).catch(() => { });
      chrome.action.setBadgeBackgroundColor({ color: "#FF6B35", tabId }).catch(() => { });
      return;
    }

    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname.replace('www.', '');

      chrome.storage.local.get({ clickedUrls: [] }, (result) => {
        const links = result.clickedUrls;

        const matches = links.filter(item => {
          try {
            return new URL(item.url.toLowerCase()).hostname.replace('www.', '') === domain;
          } catch (e) {
            return false;
          }
        });

        if (matches.length > 1) {
          chrome.action.setBadgeText({ text: matches.length.toString(), tabId }).catch(() => { });
          chrome.action.setBadgeBackgroundColor({ color: "#4f4f4f", tabId }).catch(() => { });
        } else {
          chrome.action.setBadgeText({ text: '', tabId }).catch(() => { });
        }
      });
    } catch (error) {
      chrome.action.setBadgeText({ text: '', tabId }).catch(() => { });
    }
  });
}

// Listener A: Track active tabs changing or loading URLs
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  // Fire badge logic on complete page layout generation states
  if (info.status === 'complete' && tab.url) {
    updateTabBadge(tabId, tab.url);
  }
});

// Listener B: Track tabs being flipped or focused by user mouse clicks
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      updateTabBadge(activeInfo.tabId, tab.url);
    }
  });
});

// Extension icon click listener fallback
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked on:", tab.url || '');
});

// Listen for messages from content.js to safely save URLs to storage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveUrl") {
    const url = message.url;
    chrome.storage.local.get({ clickedUrls: [] }, (result) => {
      let currentList = result.clickedUrls;

      currentList = currentList.filter(item => item.url !== url);
      currentList.unshift({ url: url, timestamp: new Date().toLocaleString() });

      chrome.storage.local.set({ clickedUrls: currentList }, () => {
        // Instantly force an operational update to the active sender tab badge on hit
        if (sender.tab && sender.tab.id && sender.tab.url) {
          updateTabBadge(sender.tab.id, sender.tab.url);
        }
      });
    });
  }
});
