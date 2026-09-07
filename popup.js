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
  const manifest = chrome.runtime.getManifest();
  renderExtensionMeta({
    name: manifest.name,
    description: manifest.description,
    repositoryUrl: manifest.homepage_url
  });
}

async function loadSettings() {
  const settings = await ExtensionSettings.readSettings();
  return settings;
}

let currentSettings = ExtensionSettings.normalizeSettings({});

function saveSettings(settings) {
  return ExtensionSettings.writeSettings(settings);
}

function getNextSettingValue(definition, currentValue) {
  if (!definition.options) {
    return !currentValue;
  }

  const currentIndex = definition.options.findIndex((option) => option.value === currentValue);
  const nextIndex = (currentIndex + 1) % definition.options.length;
  return definition.options[nextIndex].value;
}

function renderQuickSettings() {
  const container = document.getElementById('quick-settings-list');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(ExtensionSettings.SETTINGS_SCHEMA)
    .filter(([, definition]) => definition.quick)
    .forEach(([key, definition]) => {
      if (definition.type === 'color') {
        const row = document.createElement('div');
        row.className = 'menu-item quick-color-setting';
        row.title = definition.description;

        const label = document.createElement('span');
        label.className = 'quick-setting-label';
        label.textContent = definition.label;

        const input = document.createElement('input');
        input.type = 'color';
        input.dataset.setting = key;
        row.addEventListener('click', (event) => {
          if (event.target !== input) input.click();
        });
        const updateColor = () => {
          const color = ExtensionSettings.normalizeColor(input.value);
          if (currentSettings[key] === color) return;
          ExtensionSettings.writeSetting(key, color);
          currentSettings = { ...currentSettings, [key]: color };
          applySettings(currentSettings);
        };
        input.addEventListener('input', updateColor);
        input.addEventListener('change', updateColor);

        row.append(label, input);
        container.appendChild(row);
        return;
      }

      const button = document.createElement('button');
      button.className = 'menu-item setting-toggle';
      button.type = 'button';
      button.dataset.setting = key;
      button.title = definition.description;

      const label = document.createElement('span');
      label.textContent = definition.label;

      const state = document.createElement('span');
      state.className = 'toggle-state';

      button.append(label, state);
      container.appendChild(button);
    });
}

function applySettings(settings) {
  document.body.classList.toggle('dark-mode', ExtensionSettings.shouldUseDarkMode(settings.darkMode));

  document.querySelectorAll('.setting-toggle, [data-setting="highlightColor"]').forEach((control) => {
    const key = control.dataset.setting;
    const state = settings[key];
    if (control.matches('input[type="color"]')) {
      control.value = state;
      return;
    }

    const toggle = control.querySelector('.toggle-state');

    if (toggle) {
      const definition = ExtensionSettings.SETTINGS_SCHEMA[key];
      toggle.textContent = definition.options
        ? definition.options.find((option) => option.value === state)?.label || state
        : state ? 'On' : 'Off';
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

  currentSettings = await loadSettings();
  renderQuickSettings();
  applySettings(currentSettings);

  const settingsButton = document.getElementById('settings-button');
  const settingsMenu = document.getElementById('settings-menu');
  const addAwarenessButton = document.getElementById('add-awareness');
  const shareRepoButton = document.getElementById('share-repo');
  const openOptionsButton = document.getElementById('open-options');
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
      const definition = ExtensionSettings.SETTINGS_SCHEMA[key];
      currentSettings = {
        ...currentSettings,
        [key]: getNextSettingValue(definition, currentSettings[key])
      };
      currentSettings = saveSettings(currentSettings);
      applySettings(currentSettings);

      if (key === 'showBadge') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const [tab] = tabs;
          if (tab && tab.url) {
            chrome.runtime.sendMessage({ action: 'refreshBadgeState', url: tab.url });
          }
        });
      }

      if (key === 'autoScanOnOpen' && currentSettings.autoScanOnOpen) {
        scanPageForLinks();
      }
    });
  });

  if (addAwarenessButton) {
    addAwarenessButton.addEventListener('click', async () => {
      if (settingsMenu) {
        settingsMenu.classList.remove('open');
        settingsMenu.setAttribute('aria-hidden', 'true');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        showToast('no page url');
        return;
      }

      let hostname = '';
      try {
        hostname = new URL(tab.url).hostname.replace(/^www\./, '').toLowerCase();
      } catch (error) {
        hostname = '';
      }

      if (!hostname) {
        showToast('no page url');
        return;
      }

      const currentSettings = await ExtensionSettings.readSettings();
      const awareBaseUrls = ExtensionSettings.normalizeAwareHosts(currentSettings.awareBaseUrls || []);

      if (awareBaseUrls.includes(hostname)) {
        showToast(`${hostname} already in awareness`);
        return;
      }

      const nextSettings = {
        ...currentSettings,
        awareBaseUrls: Array.from(new Set([...awareBaseUrls, hostname]))
      };

      ExtensionSettings.writeSettings(nextSettings);
      showToast(`${hostname} added to awareness`);
    });
  }

  if (shareRepoButton) {
    shareRepoButton.addEventListener('click', async () => {
      settingsMenu.classList.remove('open');
      const copied = await ExtensionSettings.copyRepositoryUrl();
      showToast(copied ? 'Link copied' : 'Copy failed');
    });
  }

  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', () => {
      settingsMenu?.classList.remove('open');
      settingsMenu?.setAttribute('aria-hidden', 'true');
      chrome.runtime.openOptionsPage();
    });
  }

  if (currentSettings.autoScanOnOpen) {
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



