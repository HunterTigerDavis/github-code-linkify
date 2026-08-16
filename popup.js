// Fetch the stored (clicked) URLs, group them cleanly by site domain, and output them as a bulleted list
document.addEventListener('DOMContentLoaded', () => {
  
  // Get references to manifest for syncing strings
  function getManifestInfo() {
    const manifest = chrome.runtime.getManifest();
    const nameEl = document.getElementById("extension-name");
    const descEl = document.getElementById("extension-description");
    const repoEl = document.getElementById("extension-repo");

    if (nameEl) nameEl.textContent = manifest.name;
    if (descEl) descEl.textContent = manifest.description;
    if (repoEl) repoEl.href = manifest.homepage_url;
  }
  // load manifest info first
  getManifestInfo();

  const listContainer = document.getElementById('list-container');
  const clearBtn = document.getElementById('clear-btn');

  function loadAndGroupLinks() {
    chrome.storage.local.get({ clickedUrls: [] }, (result) => {
      const links = result.clickedUrls;
      listContainer.innerHTML = '';

      if (links.length === 0) {
        listContainer.innerHTML = '<div class="empty-msg">No clicked URLs saved yet.</div>';
        return;
      }

      // 1. Group individual links by their base site URL (Domain)
      const groupedData = {};

      links.forEach(item => {
        try {
          const urlObj = new URL(item.url);
          // Convert "://google.com" or "://google.com" into a clean "google.com" domain look
          let domain = urlObj.hostname.replace('www.', '');

          if (!groupedData[domain]) {
            groupedData[domain] = [];
          }
          groupedData[domain].push(item);
        } catch (e) {
          // Fallback if the saved text somehow isn't a valid full URL parse
          const fallback = "Other Links";
          if (!groupedData[fallback]) groupedData[fallback] = [];
          groupedData[fallback].push(item);
        }
      });

      // 2. Sort the domain keys alphabetically
      const sortedDomains = Object.keys(groupedData).sort();

      // 3. Build and append the grouped bulleted structure to the HTML
      sortedDomains.forEach(domain => {
        const domainSection = document.createElement('div');
        domainSection.className = 'domain-container';

        // Header element for the Site group
        const domainHeader = document.createElement('span');
        domainHeader.className = 'domain-title';
        domainHeader.textContent = `${domain} (${groupedData[domain].length})`;
        domainSection.appendChild(domainHeader);

        // Bulleted list element (<ul>) for this site's items
        const bulletList = document.createElement('ul');
        bulletList.className = 'url-bullet-list';

        groupedData[domain].forEach(item => {
          const li = document.createElement('li');
          li.className = 'url-item';

          const a = document.createElement('a');
          a.className = 'url-link';
          a.href = item.url;
          a.target = '_blank';

          // Truncate overly massive URLs inside the popup view to prevent visual clipping
          a.textContent = item.url.length > 50 ? item.url.substring(0, 47) + '...' : item.url;
          a.title = item.url; // Tooltip still shows full URL on mouse hover

          li.appendChild(a);
          bulletList.appendChild(li);
        });

        domainSection.appendChild(bulletList);
        listContainer.appendChild(domainSection);
      });
    });
  }

  // Clear data event handler
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ clickedUrls: [] }, () => {
      loadAndGroupLinks();
    });
  });

  // Execute on popup initialize
  loadAndGroupLinks();
});

// TODO: move to background script and trigger on extension icon click or popup open, then send links to popup for display?
// Call active script to scan page for links when popup is opened
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
    const urlList = document.getElementById("urlList");
    urlList.innerHTML = ""; // Clear previous links
    links.forEach(link => {
      const listItem = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.textContent = link;
      listItem.appendChild(anchor);
      urlList.appendChild(listItem);
    });
  }
}
chrome.runtime.onMessage.addListener(handleMessage);



