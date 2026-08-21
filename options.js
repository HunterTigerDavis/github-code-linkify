const settingsApi = globalThis.ExtensionSettings;

let currentSettings = settingsApi.normalizeSettings({});

function populateOptionsMeta() {
  chrome.runtime.sendMessage({ type: 'getExtensionMeta' }, (response) => {
    const repositoryUrl = response && response.meta ? response.meta.repositoryUrl : '';
    const repositoryLink = document.getElementById('options-repo');

    if (repositoryLink && repositoryUrl) {
      repositoryLink.href = repositoryUrl;
    }
  });
}

function showStatus(message) {
  const status = document.getElementById('save-status');
  if (!status) return;

  status.textContent = message;
  clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = setTimeout(() => {
    status.textContent = '';
  }, 1800);
}

function applyTheme(settings) {
  document.body.classList.toggle('dark-mode', !!settings.darkMode);
}

function renderToggles(settings) {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    input.checked = !!settings[input.dataset.setting];
  });
}

function renderList(containerId, values, removeValue) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  values.forEach((value) => {
    const item = document.createElement('li');
    item.className = 'active-item';

    const label = document.createElement('span');
    label.textContent = value;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-button';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', `Remove ${value}`);
    removeButton.addEventListener('click', () => removeValue(value));

    item.append(label, removeButton);
    container.appendChild(item);
  });
}

function renderSettings(settings) {
  currentSettings = settingsApi.normalizeSettings(settings);
  applyTheme(currentSettings);
  renderToggles(currentSettings);
  renderList('site-list', currentSettings.awareBaseUrls, removeSite);
  renderList('keyword-list', currentSettings.awareKeywords, removeKeyword);
}

function persistSettings(nextSettings, message = 'Saved') {
  currentSettings = settingsApi.writeSettings(nextSettings);
  renderSettings(currentSettings);
  showStatus(message);
}

function addSite(event) {
  event.preventDefault();
  const input = document.getElementById('site-input');
  const site = settingsApi.normalizeAwareHosts([input.value])[0];
  if (!site) return;

  const sites = settingsApi.normalizeAwareHosts(currentSettings.awareBaseUrls);
  if (sites.includes(site)) {
    showStatus('Site already active');
    return;
  }

  persistSettings({ ...currentSettings, awareBaseUrls: [...sites, site] }, 'Site added');
  input.value = '';
}

function addKeyword(event) {
  event.preventDefault();
  const input = document.getElementById('keyword-input');
  const keyword = settingsApi.normalizeAwareKeywords([input.value])[0];
  if (!keyword) return;

  const keywords = settingsApi.normalizeAwareKeywords(currentSettings.awareKeywords);
  if (keywords.includes(keyword)) {
    showStatus('Keyword already active');
    return;
  }

  persistSettings({ ...currentSettings, awareKeywords: [...keywords, keyword] }, 'Keyword added');
  input.value = '';
}

function removeSite(site) {
  const sites = currentSettings.awareBaseUrls.filter((value) => value !== site);
  persistSettings({ ...currentSettings, awareBaseUrls: sites }, 'Site removed');
}

function removeKeyword(keyword) {
  const keywords = currentSettings.awareKeywords.filter((value) => value !== keyword);
  persistSettings({ ...currentSettings, awareKeywords: keywords }, 'Keyword removed');
}

document.addEventListener('DOMContentLoaded', async () => {
  populateOptionsMeta();
  renderSettings(await settingsApi.readSettings());

  document.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      persistSettings({ ...currentSettings, [input.dataset.setting]: input.checked });
    });
  });

  document.getElementById('site-form').addEventListener('submit', addSite);
  document.getElementById('keyword-form').addEventListener('submit', addKeyword);
  document.getElementById('reset-settings').addEventListener('click', () => {
    persistSettings({ ...settingsApi.DEFAULT_SETTINGS, awareBaseUrls: [...settingsApi.DEFAULT_AWARE_BASE_URLS], awareKeywords: [...settingsApi.DEFAULT_AWARE_KEYWORDS] }, 'Settings reset');
  });

  settingsApi.watchSettings((settings) => renderSettings(settings));
});
