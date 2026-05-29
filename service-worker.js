// Auto-trigger popup when extension reloads/installs
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.openPopup();
    console.log("Extension loaded, popup triggered");
});

// Detect ticket/concert sites and show badge
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (!tab.url) return;

    const url = tab.url.toLowerCase();
    const gitSites = ['github.com', 'gitlab.com', 'bitbucket.org'];

    if (gitSites.some(site => url.includes(site))) {
        chrome.action.setBadgeText({ text: "!", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#FF6B35", tabId });
        console.log("Git site detected:", url);
    } else {
        // Clear badge on non-git sites
        chrome.action.setBadgeText({ text: "", tabId });
    }
});