const settingsApi = globalThis.ExtensionSettings;

let currentSettings = settingsApi.normalizeSettings({});

function populateOptionsMeta() {
  const repositoryUrl = chrome.runtime.getManifest().homepage_url || '';
  const repositoryLink = document.getElementById('options-repo');

  if (repositoryLink && repositoryUrl) {
    repositoryLink.href = repositoryUrl;
  }
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

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.remove('visible'), 1800);
}

function applyTheme(settings) {
  document.body.classList.toggle('dark-mode', settingsApi.shouldUseDarkMode(settings.darkMode));
}

function renderBooleanSettings() {
  const container = document.querySelector('.setting-grid');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(settingsApi.SETTINGS_SCHEMA)
    .filter(([, definition]) => ['boolean', 'choice', 'color'].includes(definition.type))
    .forEach(([key, definition]) => {
      const row = document.createElement('label');
      row.className = 'setting-row';

      const text = document.createElement('span');
      const label = document.createElement('strong');
      label.textContent = definition.label;
      const description = document.createElement('small');
      description.textContent = definition.description;
      text.append(label, description);

      const input = definition.type === 'choice'
        ? document.createElement('select')
        : document.createElement('input');
      if (definition.type === 'boolean') {
        input.type = 'checkbox';
      } else if (definition.type === 'color') {
        input.type = 'color';
      } else {
        definition.options.forEach((option) => {
          const choice = document.createElement('option');
          choice.value = option.value;
          choice.textContent = option.label;
          input.appendChild(choice);
        });
      }
      input.dataset.setting = key;

      row.append(text, input);

      if (definition.resetLabel) {
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'setting-reset-button';
        resetButton.dataset.settingReset = key;
        resetButton.textContent = definition.resetLabel;
        row.appendChild(resetButton);
      }

      container.appendChild(row);
    });
}

function renderCollectionMetadata() {
  document.querySelectorAll('[data-setting-section]').forEach((section) => {
    const definition = settingsApi.SETTINGS_SCHEMA[section.dataset.settingSection];
    if (!definition) return;

    const heading = section.querySelector('h2');
    const description = section.querySelector('.section-heading p');
    const input = section.querySelector('input');
    const inputLabel = section.querySelector('label.sr-only');
    const addButton = section.querySelector('form button[type="submit"]');

    if (heading) heading.textContent = definition.label;
    if (description) description.textContent = definition.description;
    if (input) input.placeholder = definition.inputPlaceholder;
    if (inputLabel) inputLabel.textContent = definition.inputLabel;
    if (addButton) addButton.textContent = definition.addLabel;
  });
}

function renderToggles(settings) {
  document.querySelectorAll('[data-setting]').forEach((input) => {
    const key = input.dataset.setting;
    const definition = settingsApi.SETTINGS_SCHEMA[key];
    if (definition.type === 'choice') {
      input.value = settings[key];
    } else if (definition.type === 'color') {
      input.value = settings[key];
    } else {
      input.checked = !!settings[key];
    }
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
  settingsApi.writeSettings(nextSettings)
    .then((savedSettings) => {
      currentSettings = savedSettings;
      renderSettings(currentSettings);
      showStatus(message);
    })
    .catch((error) => {
      console.error('Unable to save extension settings:', error);
      showStatus('Unable to save settings');
    });
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

function clearSites() {
  persistSettings({ ...currentSettings, awareBaseUrls: [] }, 'All sites cleared');
}

function clearKeywords() {
  persistSettings({ ...currentSettings, awareKeywords: [] }, 'All keywords cleared');
}

document.addEventListener('DOMContentLoaded', async () => {
  populateOptionsMeta();
  renderBooleanSettings();
  renderCollectionMetadata();
  renderSettings(await settingsApi.readSettings());

  document.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      const definition = settingsApi.SETTINGS_SCHEMA[input.dataset.setting];
      const value = definition.type === 'choice' || definition.type === 'color'
        ? input.value
        : input.checked;
      persistSettings({ ...currentSettings, [input.dataset.setting]: value });
    });
  });

  document.getElementById('site-form').addEventListener('submit', addSite);
  document.getElementById('keyword-form').addEventListener('submit', addKeyword);
  document.getElementById('clear-sites').addEventListener('click', clearSites);
  document.getElementById('clear-keywords').addEventListener('click', clearKeywords);
  document.querySelectorAll('[data-setting-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.settingReset;
      persistSettings({ ...currentSettings, [key]: settingsApi.DEFAULT_SETTINGS[key] }, 'Highlight color reset');
    });
  });
  document.getElementById('share-repo').addEventListener('click', async () => {
    const copied = await settingsApi.copyRepositoryUrl();
    showToast(copied ? 'Link copied' : 'Copy failed');
  });
  document.getElementById('reset-settings').addEventListener('click', () => {
    persistSettings({ ...settingsApi.DEFAULT_SETTINGS, awareBaseUrls: [...settingsApi.DEFAULT_AWARE_BASE_URLS], awareKeywords: [...settingsApi.DEFAULT_AWARE_KEYWORDS] }, 'Settings reset');
  });

  settingsApi.watchSettings((settings) => renderSettings(settings));
});
