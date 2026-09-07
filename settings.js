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

const SETTINGS_SCHEMA = {
  autoScanOnOpen: {
    type: 'boolean',
    defaultValue: false,
    label: 'Auto scan on popup open',
    description: 'Scan the active tab for all URLs when the popup opens.',
    quick: true
  },
  darkMode: {
    type: 'choice',
    defaultValue: 'system',
    label: 'Color theme',
    description: 'Choose light, dark, or the browser color preference.',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System' }
    ],
    quick: true
  },
  showBadge: {
    type: 'boolean',
    defaultValue: true,
    label: 'Code-aware badge',
    description: 'Show the action badge for recognized pages.',
    quick: true
  },
  enableBaseUrlCheck: {
    type: 'boolean',
    defaultValue: true,
    label: 'Base URL awareness',
    description: 'Recognize pages by their configured hostname or base URL.',
    quick: true
  },
  enableKeywordCheck: {
    type: 'boolean',
    defaultValue: true,
    label: 'Keyword awareness',
    description: 'Recognize pages when their URL contains a configured keyword.',
    quick: true
  },
  awareBaseUrls: {
    type: 'list',
    defaultValue: [...DEFAULT_AWARE_BASE_URLS],
    label: 'Aware sites',
    description: 'Add hostnames or base URL fragments that should always be treated as code-aware.',
    inputLabel: 'Site hostname or base URL',
    inputPlaceholder: 'example.com or code.example.com',
    addLabel: 'Add site'
  },
  awareKeywords: {
    type: 'list',
    defaultValue: [...DEFAULT_AWARE_KEYWORDS],
    label: 'Aware keywords',
    description: 'Add URL fragments such as /pull/ or /review/ to recognize matching pages.',
    inputLabel: 'URL keyword',
    inputPlaceholder: '/review/',
    addLabel: 'Add keyword'
  }
};

const DEFAULT_SETTINGS = Object.fromEntries(
  Object.entries(SETTINGS_SCHEMA).map(([key, { defaultValue }]) => [
    key,
    Array.isArray(defaultValue) ? [...defaultValue] : defaultValue
  ])
);

const SETTING_KEYS = Object.keys(SETTINGS_SCHEMA);

function getStorageArea() {
  const storageApi = globalThis.chrome?.storage || globalThis.browser?.storage;
  const storageArea = storageApi?.local;

  if (!storageArea) {
    throw new Error('Extension storage is unavailable in this execution context.');
  }

  return storageArea;
}

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

function normalizeThemeMode(value, fallback = DEFAULT_SETTINGS.darkMode) {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'dark' : 'light';
  }

  return fallback;
}

function getSystemDarkMode() {
  return typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
}

function shouldUseDarkMode(themeMode) {
  const normalizedMode = normalizeThemeMode(themeMode);
  return normalizedMode === 'dark' || (normalizedMode === 'system' && getSystemDarkMode());
}

function normalizeSettings(rawSettings = {}) {
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    autoScanOnOpen: normalizeBoolean(source.autoScanOnOpen, DEFAULT_SETTINGS.autoScanOnOpen),
    darkMode: normalizeThemeMode(source.darkMode),
    showBadge: normalizeBoolean(source.showBadge, DEFAULT_SETTINGS.showBadge),
    enableBaseUrlCheck: normalizeBoolean(source.enableBaseUrlCheck, DEFAULT_SETTINGS.enableBaseUrlCheck),
    enableKeywordCheck: normalizeBoolean(source.enableKeywordCheck, DEFAULT_SETTINGS.enableKeywordCheck),
    awareBaseUrls: normalizeAwareHosts(source.awareBaseUrls ?? DEFAULT_AWARE_BASE_URLS),
    awareKeywords: normalizeAwareKeywords(source.awareKeywords ?? DEFAULT_AWARE_KEYWORDS)
  };
}

function readSettings() {
  return new Promise((resolve) => {
    getStorageArea().get(SETTING_KEYS, (result) => {
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
  getStorageArea().set(normalized);
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

    readSettings().then(onChange).catch((error) => {
      console.error('Unable to read changed extension settings:', error);
    });
  };

  const storageApi = globalThis.chrome?.storage || globalThis.browser?.storage;
  if (!storageApi?.onChanged) {
    return () => {};
  }

  storageApi.onChanged.addListener(listener);

  return () => {
    storageApi.onChanged.removeListener(listener);
  };
}

globalThis.ExtensionSettings = {
  SETTINGS_SCHEMA,
  SETTING_KEYS,
  DEFAULT_SETTINGS,
  DEFAULT_AWARE_BASE_URLS,
  DEFAULT_AWARE_KEYWORDS,
  normalizeAwareHosts,
  normalizeAwareKeywords,
  normalizeBoolean,
  normalizeThemeMode,
  getSystemDarkMode,
  shouldUseDarkMode,
  normalizeSettings,
  readSettings,
  writeSettings,
  watchSettings
};

if (typeof window !== 'undefined') {
  window.ExtensionSettings = globalThis.ExtensionSettings;
}
