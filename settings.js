const SETTINGS_KEY = 'extensionSettings';

const DEFAULT_AWARE_BASE_URLS = [
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'azure.com/repos',
  'azure.com/git'
];

const DEFAULT_AWARE_KEYWORDS = [
  '/pull/',
  '/commit/',
  '/blob/',
  '/changes/',
  '/compare/',
  '/wiki/',
  '/issues',
  '/discussions'
];

const DEFAULT_SETTINGS = {
  autoScanOnOpen: false,
  darkMode: false,
  showBadge: true,
  enableBaseUrlCheck: true,
  enableKeywordCheck: true,
  awareBaseUrls: [...DEFAULT_AWARE_BASE_URLS],
  awareKeywords: [...DEFAULT_AWARE_KEYWORDS]
};

function normalizeAwareHosts(hosts) {
  if (!Array.isArray(hosts)) {
    return [];
  }

  return hosts
    .map((host) => String(host).toLowerCase().replace(/^www\./, '').trim())
    .filter(Boolean);
}

function normalizeAwareKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function normalizeSettings(rawSettings = {}) {
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    ...DEFAULT_SETTINGS,
    ...source,
    awareBaseUrls: normalizeAwareHosts(source.awareBaseUrls ?? DEFAULT_AWARE_BASE_URLS),
    awareKeywords: normalizeAwareKeywords(source.awareKeywords ?? DEFAULT_AWARE_KEYWORDS)
  };
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      const saved = result[SETTINGS_KEY] || {};
      const nextSettings = normalizeSettings(saved);
      chrome.storage.local.set({ [SETTINGS_KEY]: nextSettings });
      resolve(nextSettings);
    });
  });
}

function writeSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);
  chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
  return normalized;
}

function watchSettings(onChange) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  const listener = (changes, namespace) => {
    if (namespace !== 'local' || !changes[SETTINGS_KEY]) {
      return;
    }

    const nextValue = changes[SETTINGS_KEY].newValue || {};
    onChange(normalizeSettings(nextValue));
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

globalThis.ExtensionSettings = {
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  DEFAULT_AWARE_BASE_URLS,
  DEFAULT_AWARE_KEYWORDS,
  normalizeAwareHosts,
  normalizeAwareKeywords,
  normalizeSettings,
  readSettings,
  writeSettings,
  watchSettings
};

if (typeof window !== 'undefined') {
  window.ExtensionSettings = globalThis.ExtensionSettings;
}
