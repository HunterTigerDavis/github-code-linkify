// Auto-trigger popup when extension reloads/installs
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.openPopup();
    console.log("Extension loaded, popup triggered");
});

// Detect git sites and show badge on extension icon for visibility
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (!tab.url) return;

    const url = tab.url.toLowerCase();
    const gitSites = ['github.com', 'gitlab.com', 'bitbucket.org', 'azure.com/repos', 'azure.com/git' ];
    // example github PR url: github.com/*/*/pull/*/changes
    // https://github.com/HunterTigerDavis/github-link-clicker-extension/pull/1/changes

    if (gitSites.some(site => url.includes(site))) {
        chrome.action.setBadgeText({ text: "!", tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#FF6B35", tabId });
        console.log("Git site detected:", url);
        // chrome.tabs.sendMessage to script.js 
    } else {
        // Clear badge on non-git sites
        chrome.action.setBadgeText({ text: "", tabId });
    }
});

// Listen for github PR site, trigger notification, tab context to scan for links


// extension icon click listener to trigger popup and scan current tab for links, then display in popup
// chrome.action.onClicked.addListener(tab => {
//     chrome.scripting.executeScript({
//         target: { tabId: tab.id },
//         func: () => {
//             alert("Extension icon clicked! Scanning for clickable links...");
//         }
//     });
// });