function renderExtensionMeta(meta = {}) {
  const nameEl = document.getElementById('extension-name');
  const descEl = document.getElementById('extension-description');
  const repoEl = document.getElementById('extension-repo');
  const { name, description, repositoryUrl } = meta;

  if (nameEl) nameEl.textContent = name;
  if (descEl) descEl.textContent = description;
  if (repoEl && repositoryUrl) {
    repoEl.href = repositoryUrl;
  }
}

function populateExtensionMeta() {
  chrome.runtime.sendMessage({ type: 'getExtensionMeta' }, (response) => {
    const meta = response && response.meta ? response.meta : {};
    renderExtensionMeta(meta);
  });
}

const defaultSettings = {
  autoScanOnOpen: true,
  darkMode: false,
  showBadge: true
};

function getSystemDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionSettings'], (result) => {
      const saved = result.extensionSettings || {};
      const darkMode = typeof saved.darkMode === 'boolean' ? saved.darkMode : getSystemDarkMode();
      const settings = { ...defaultSettings, ...saved, darkMode };
      chrome.storage.local.set({ extensionSettings: settings });
      resolve(settings);
    });
  });
}

function saveSettings(settings) {
  chrome.storage.local.set({ extensionSettings: settings });
}

function applySettings(settings) {
  document.body.classList.toggle('dark-mode', !!settings.darkMode);

  document.querySelectorAll('.setting-toggle').forEach((button) => {
    const key = button.dataset.setting;
    const state = !!settings[key];
    const toggle = button.querySelector('.toggle-state');

    if (toggle) {
      toggle.textContent = state ? 'On' : 'Off';
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('visible');
  }, 1800);
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

function setSavedLinksCount(count) {
  const totalCountEl = document.getElementById('saved-links-count');
  if (totalCountEl) {
    totalCountEl.textContent = `(${count})`;
  }
}

function renderSavedLinks() {
  const listContainer = document.getElementById('list-container');
  if (!listContainer) return;

  chrome.storage.local.get({ clickedUrls: [] }, (result) => {
    const links = Array.isArray(result.clickedUrls) ? result.clickedUrls : [];
    setSavedLinksCount(links.length);
    listContainer.innerHTML = '';

    if (links.length === 0) {
      listContainer.innerHTML = '<div class="empty-msg">No clicked URLs saved yet.</div>';
      return;
    }

    const groupedData = {};

    links.forEach(item => {
      const domain = getHostname(item.url);

      if (!domain) {
        const fallback = 'Other Links';
        if (!groupedData[fallback]) groupedData[fallback] = [];
        groupedData[fallback].push(item);
        return;
      }

      if (!groupedData[domain]) {
        groupedData[domain] = [];
      }
      groupedData[domain].push(item);
    });

    const sortedDomains = Object.keys(groupedData).sort();

    sortedDomains.forEach(domain => {
      const domainSection = document.createElement('div');
      domainSection.className = 'domain-container';

      const domainHeaderRow = document.createElement('div');
      domainHeaderRow.style.display = 'flex';
      domainHeaderRow.style.alignItems = 'center';
      domainHeaderRow.style.justifyContent = 'space-between';
      domainHeaderRow.style.gap = '8px';

      const domainHeader = document.createElement('span');
      domainHeader.className = 'domain-title';
      domainHeader.textContent = `${domain} (${groupedData[domain].length})`;
      domainHeader.style.flex = '1';
      domainHeader.style.borderBottom = 'none';
      domainHeaderRow.appendChild(domainHeader);

      const clearDomainBtn = document.createElement('button');
      clearDomainBtn.type = 'button';
      clearDomainBtn.textContent = 'Clear';
      clearDomainBtn.style.padding = '3px 6px';
      clearDomainBtn.addEventListener('click', () => {
        chrome.storage.local.get({ clickedUrls: [] }, (storageResult) => {
          const filtered = (storageResult.clickedUrls || []).filter((item) => {
            const itemHostname = getHostname(item.url);
            if (domain === 'Other Links') {
              return !!itemHostname;
            }
            return itemHostname !== domain;
          });
          chrome.storage.local.set({ clickedUrls: filtered }, () => renderSavedLinks());
        });
      });
      domainHeaderRow.appendChild(clearDomainBtn);
      domainSection.appendChild(domainHeaderRow);

      const bulletList = document.createElement('ul');
      bulletList.className = 'url-bullet-list';

      groupedData[domain].forEach(item => {
        const li = document.createElement('li');
        li.className = 'url-item';

        const a = document.createElement('a');
        a.className = 'url-link';
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = item.url;
        a.textContent = item.url.length > 50 ? item.url.substring(0, 47) + '...' : item.url;
        a.addEventListener('click', (event) => {
          event.preventDefault();
          recordClickedUrl(item.url);
          window.open(item.url, '_blank', 'noopener,noreferrer');
          renderSavedLinks();
        });

        li.appendChild(a);
        bulletList.appendChild(li);
      });

      domainSection.appendChild(bulletList);
      listContainer.appendChild(domainSection);
    });
  });
}

function recordClickedUrl(url) {
  if (!url) return;

  chrome.storage.local.get({ clickedUrls: [] }, (result) => {
    const currentList = Array.isArray(result.clickedUrls) ? result.clickedUrls : [];
    const filtered = currentList.filter(item => item && item.url !== url);
    filtered.unshift({ url, timestamp: new Date().toISOString() });

    chrome.storage.local.set({ clickedUrls: filtered }, () => renderSavedLinks());
  });
}

// Fetch the stored (clicked) URLs, group them cleanly by site domain, and output them as a bulleted list
document.addEventListener('DOMContentLoaded', async () => {
  populateExtensionMeta();

  let settings = await loadSettings();
  applySettings(settings);

  const settingsButton = document.getElementById('settings-button');
  const settingsMenu = document.getElementById('settings-menu');
  const shareRepoButton = document.getElementById('share-repo');
  const listContainer = document.getElementById('list-container');
  const clearBtn = document.getElementById('clear-btn');

  if (settingsButton && settingsMenu) {
    settingsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = settingsMenu.classList.toggle('open');
      settingsMenu.setAttribute('aria-hidden', String(!isOpen));
    });
  }

  document.addEventListener('click', (event) => {
    if (settingsMenu && !settingsMenu.contains(event.target) && settingsButton && !settingsButton.contains(event.target)) {
      settingsMenu.classList.remove('open');
      settingsMenu.setAttribute('aria-hidden', 'true');
    }
  });

  document.querySelectorAll('.setting-toggle').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const key = button.dataset.setting;
      settings = { ...settings, [key]: !settings[key] };
      saveSettings(settings);
      applySettings(settings);

      if (key === 'showBadge') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const [tab] = tabs;
          if (tab && tab.url) {
            chrome.runtime.sendMessage({ action: 'refreshBadgeState', url: tab.url });
          }
        });
      }

      if (key === 'autoScanOnOpen' && settings.autoScanOnOpen) {
        scanPageForLinks();
      }
    });
  });

  if (shareRepoButton) {
    shareRepoButton.addEventListener('click', async () => {
      settingsMenu.classList.remove('open');

      chrome.runtime.sendMessage({ type: 'getExtensionMeta' }, async (response) => {
        const repoUrl = (response && response.meta && response.meta.repositoryUrl) || chrome.runtime.getManifest().homepage_url || '';

        if (!repoUrl) {
          showToast('link copied');
          return;
        }

        try {
          await navigator.clipboard.writeText(repoUrl);
          showToast('link copied');
        } catch (error) {
          const tempInput = document.createElement('textarea');
          tempInput.value = repoUrl;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          showToast('link copied');
        }
      });
    });
  }

  if (settings.autoScanOnOpen) {
    scanPageForLinks();
  }

  renderSavedLinks();

  // Clear data event handler
  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ clickedUrls: [] }, () => {
      renderSavedLinks();
    });
  });

  // Execute on popup initialize
  renderSavedLinks();
});

function bindScannedLinkClick(link) {
  const anchor = document.createElement('a');
  anchor.href = link;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = link;
  anchor.addEventListener('click', (event) => {
    event.preventDefault();
    recordClickedUrl(link);
    window.open(link, '_blank', 'noopener,noreferrer');
    renderSavedLinks();
  });
  return anchor;
}

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
    const links = request.data;
    const urlList = document.getElementById("urlList");
    urlList.innerHTML = "";
    links.forEach(link => {
      const listItem = document.createElement("li");
      listItem.appendChild(bindScannedLinkClick(link));
      urlList.appendChild(listItem);
    });
  }
}
chrome.runtime.onMessage.addListener(handleMessage);



