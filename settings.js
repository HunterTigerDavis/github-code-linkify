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
  darkMode: true,
  showBadge: true,
  enableBaseUrlCheck: true,
  enableKeywordCheck: true,
  awareBaseUrls: [...DEFAULT_AWARE_BASE_URLS],
  awareKeywords: [...DEFAULT_AWARE_KEYWORDS]
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

function normalizeAwareHosts(hosts) {
  if (!Array.isArray(hosts)) {
    return [];
  }

  return hosts
    .map((host) => String(host).toLowerCase().replace(/^www\./, '').trim())
    .filter(Boolean)
    .filter((host, index, values) => values.indexOf(host) === index);
}

function normalizeAwareKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .map((keyword) => String(keyword).trim())
    .filter(Boolean)
    .filter((keyword, index, values) => values.indexOf(keyword) === index);
}

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeSettings(rawSettings = {}) {
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    autoScanOnOpen: normalizeBoolean(source.autoScanOnOpen, DEFAULT_SETTINGS.autoScanOnOpen),
    darkMode: normalizeBoolean(source.darkMode, DEFAULT_SETTINGS.darkMode),
    showBadge: normalizeBoolean(source.showBadge, DEFAULT_SETTINGS.showBadge),
    enableBaseUrlCheck: normalizeBoolean(source.enableBaseUrlCheck, DEFAULT_SETTINGS.enableBaseUrlCheck),
    enableKeywordCheck: normalizeBoolean(source.enableKeywordCheck, DEFAULT_SETTINGS.enableKeywordCheck),
    awareBaseUrls: normalizeAwareHosts(source.awareBaseUrls ?? DEFAULT_AWARE_BASE_URLS),
    awareKeywords: normalizeAwareKeywords(source.awareKeywords ?? DEFAULT_AWARE_KEYWORDS)
  };
}

function readSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTING_KEYS, (result) => {
      const saved = {};

      SETTING_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          saved[key] = result[key];
        }
      });

      resolve(normalizeSettings(saved));
    });
  });
}

function writeSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);
  chrome.storage.local.set(normalized);
  return normalized;
}

function watchSettings(onChange) {
  if (typeof onChange !== 'function') {
    return () => {};
  }

  const listener = (changes, namespace) => {
    const hasSettingChange = SETTING_KEYS.some((key) => changes[key]);

    if (namespace !== 'local' || !hasSettingChange) {
      return;
    }

    readSettings().then(onChange);
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

globalThis.ExtensionSettings = {
  SETTING_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_AWARE_BASE_URLS,
  DEFAULT_AWARE_KEYWORDS,
  normalizeAwareHosts,
  normalizeAwareKeywords,
  normalizeBoolean,
  normalizeSettings,
  readSettings,
  writeSettings,
  watchSettings
};

if (typeof window !== 'undefined') {
  window.ExtensionSettings = globalThis.ExtensionSettings;
}
