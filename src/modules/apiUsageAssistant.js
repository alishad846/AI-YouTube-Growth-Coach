const STORAGE_KEYS = {
  defaultLimit: 'YT_DEFAULT_API_LIMIT_REACHED',
  userLimit: 'YT_USER_API_LIMIT_REACHED',
  userKey: 'YOUTUBE_API_KEY',
  defaultUsageCount: 'YT_DEFAULT_API_USAGE_COUNT',
};

const MAX_DEFAULT_API_USES = 1;

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

function getDefaultUsageCount() {
  const raw = getStorageArea().getItem(STORAGE_KEYS.defaultUsageCount);
  return Number(raw) || 0;
}

function setDefaultUsageCount(value) {
  getStorageArea().setItem(
    STORAGE_KEYS.defaultUsageCount,
    String(Math.max(0, Number(value) || 0)),
  );
}

function resetDefaultUsageCount() {
  getStorageArea().removeItem(STORAGE_KEYS.defaultUsageCount);
}

export function canUseDefaultApi() {
  return getDefaultUsageCount() < MAX_DEFAULT_API_USES;
}

export function incrementDefaultApiUsage() {
  const next = getDefaultUsageCount() + 1;
  setDefaultUsageCount(next);
  if (next >= MAX_DEFAULT_API_USES) {
    markDefaultApiLimitReached();
  }
  return next;
}
export function clearDefaultApiLimitReached() {
  getStorageArea().removeItem(STORAGE_KEYS.defaultLimit);
  resetDefaultUsageCount();
}

export function isDefaultLimitStale() {
  return hasDefaultApiLimitReached() && getDefaultUsageCount() === 0;
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

export function getDefaultApiUsageCount() {
  return getDefaultUsageCount();
}

export function getDefaultApiUsageRemaining() {
  return Math.max(MAX_DEFAULT_API_USES - getDefaultUsageCount(), 0);
}
