// Auto-trigger popup when extension reloads/installs
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.openPopup().catch(() => { });
  console.log("Extension loaded, popup triggered");
});

// Helper function to dynamically manage badges safely with promise error suppression
function updateTabBadge(tabId, urlString) {
  if (!urlString) return;
  const url = urlString.toLowerCase();

  const gitSites = ['github.com', 'gitlab.com', 'bitbucket.org', 'azure.com/repos', 'azure.com/git'];

  // 1. DUAL BADGE SYSTEM SYSTEM: If browsing an active developer repository platform
  if (gitSites.some(site => url.includes(site))) {
    chrome.action.setBadgeText({ text: "!", tabId: tabId }).catch(() => { });
    chrome.action.setBadgeBackgroundColor({ color: "#FF6B35", tabId: tabId }).catch(() => { });
    return;
  }

  // 2. COUNTER SYSTEM SYSTEM: If on an external destination, count how many times we referenced this site
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

      if (matches.length > 0) {
        // Show uBlock-style counter badge for active link matches
        chrome.action.setBadgeText({ text: matches.length.toString(), tabId: tabId }).catch(() => { });
        chrome.action.setBadgeBackgroundColor({ color: "#4f4f4f", tabId: tabId }).catch(() => { });
      } else {
        // Safe baseline clear if zero database matches are found
        chrome.action.setBadgeText({ text: "", tabId: tabId }).catch(() => { });
      }
    });
  } catch (error) {
    // Graceful exception interceptor for native interior chrome:// paths
    chrome.action.setBadgeText({ text: "", tabId: tabId }).catch(() => { });
  }
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
