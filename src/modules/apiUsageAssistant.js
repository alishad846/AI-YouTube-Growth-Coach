const STORAGE_KEYS = {
  defaultLimit: 'YT_DEFAULT_API_LIMIT_REACHED',
  userLimit: 'YT_USER_API_LIMIT_REACHED',
  userKey: 'YOUTUBE_API_KEY',
};

function getStorageArea() {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  if (!globalThis.__apiUsageStorage) {
    globalThis.__apiUsageStorage = {};
  }
  return {
    getItem: (key) => globalThis.__apiUsageStorage[key] || null,
    setItem: (key, value) => {
      globalThis.__apiUsageStorage[key] = String(value);
    },
    removeItem: (key) => {
      delete globalThis.__apiUsageStorage[key];
    },
  };
}

function readFlag(key) {
  return getStorageArea().getItem(key) === '1';
}

export function hasDefaultApiLimitReached() {
  return readFlag(STORAGE_KEYS.defaultLimit);
}

export function markDefaultApiLimitReached() {
  getStorageArea().setItem(STORAGE_KEYS.defaultLimit, '1');
}

export function clearDefaultApiLimitReached() {
  getStorageArea().removeItem(STORAGE_KEYS.defaultLimit);
}

export function hasUserApiLimitReached() {
  return readFlag(STORAGE_KEYS.userLimit);
}

export function markUserApiLimitReached() {
  getStorageArea().setItem(STORAGE_KEYS.userLimit, '1');
}

export function clearUserApiLimitReached() {
  getStorageArea().removeItem(STORAGE_KEYS.userLimit);
}

export function getStoredUserKey() {
  const candidate = getStorageArea().getItem(STORAGE_KEYS.userKey);
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

export function setStoredUserKey(value) {
  if (!value || typeof value !== 'string') {
    removeStoredUserKey();
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    removeStoredUserKey();
    return;
  }
  getStorageArea().setItem(STORAGE_KEYS.userKey, trimmed);
  clearUserApiLimitReached();
}

export function removeStoredUserKey() {
  getStorageArea().removeItem(STORAGE_KEYS.userKey);
  clearUserApiLimitReached();
}

export function isApiKeyFormatValid(value) {
  return typeof value === 'string' && value.trim().startsWith('AIza');
}

export function getDefaultApiKey() {
  if (typeof globalThis === 'undefined') {
    return null;
  }
  return globalThis?.YOUTUBE_API_KEY || null;
}

export function isDefaultApiAvailable() {
  return !hasDefaultApiLimitReached();
}

export function isUsingUserKey() {
  return Boolean(getStoredUserKey()) && !hasUserApiLimitReached();
}

export function shouldShowApiKeyInput() {
  return hasDefaultApiLimitReached() || hasUserApiLimitReached();
}
