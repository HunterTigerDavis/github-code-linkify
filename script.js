// Call active script to scan page for links when popup is opened
// TODO: move to background script and trigger on extension icon click or popup open, then send links to popup for display?
async function scanPageForLinks() {
    let [tab] = await chrome.tabs.query({ active: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Get all links on the page
            const links = Array.from(document.querySelectorAll('a')).map(link => link.href);
            // log the links to the console for debugging
            console.log("Links found on the page:", links);
            // Send the links back to the popup
            chrome.runtime.sendMessage({ type: 'links', data: links });
            // filter links by base URL of current page for grouping
            const baseUrl = window.location.origin;
            const filteredLinks = links.filter(link => link.startsWith(baseUrl));
            console.log("Filtered links (same base URL):", filteredLinks);

            // read links from github PR page: textarea id="read-only-cursor-text-area" aria-label="file content"

        }
    });
}
document.getElementById("scanButton").addEventListener("click", scanPageForLinks);

// TODO: message passing
// listen for messages from the content script and display links in the popup
function handleMessage(request, sender, sendResponse) {
    if (request.type === 'links') {
        // test
        const links = request.data;
        const linksList = document.getElementById("linksList");
        linksList.innerHTML = ""; // Clear previous links
        links.forEach(link => {
            const listItem = document.createElement("li");
            const anchor = document.createElement("a");
            anchor.href = link;
            anchor.target = "_blank";
            anchor.textContent = link;
            listItem.appendChild(anchor);
            linksList.appendChild(listItem);
        });
    }
}
chrome.runtime.onMessage.addListener(handleMessage);


// test alert function
async function sayHello() {
    console.log("Hello from the extension!");
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query({ active: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // inject into the actual page context to access DOM and find links, then display in popup:
            // document.body
            alert("Hello from the extension!");
            // notification test instead of alert:
            // var opt = {
            //     type: 'basic',
            //     iconUrl: 'icons/icon64.png',
            //     title: 'Hello from the extension!',
            //     contextMessage: 'Test simple notification.'
            // };
            //   chrome.notifications.create('notify1', opt, function(id) { console.log("Last error:", chrome.runtime.lastError); });

        }
    });
}
document.getElementById("myButton").addEventListener("click", sayHello);