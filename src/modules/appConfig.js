import { LocalStorageManager } from './localStorageManager.js';

function readAppConfig() {
  return LocalStorageManager.getPreferences();
}

function persistAppConfig(update) {
  LocalStorageManager.setPreferences(update);
}

function buildRulePayload(rule) {
  const id = `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const trigger = rule.trigger && rule.trigger !== 'any' ? rule.trigger : 'any';
  return {
    id,
    title: rule.title.trim(),
    message: rule.message.trim(),
    trigger
  };
}

export function getAppConfig() {
  return readAppConfig();
}

export function saveAppConfig(patch) {
  persistAppConfig(patch);
}

export function addCustomRecommendation(rule) {
  if (!rule?.title || !rule?.message) {
    throw new Error('Custom recommendation requires a title and message.');
  }
  const payload = buildRulePayload(rule);
  const config = readAppConfig();
  const next = [...(config.customRecommendations || []), payload];
  persistAppConfig({ customRecommendations: next });
  return next;
}

export function removeCustomRecommendation(id) {
  const config = readAppConfig();
  const filtered = (config.customRecommendations || []).filter((item) => item.id !== id);
  persistAppConfig({ customRecommendations: filtered });
  return filtered;
}

export function deriveTimingWindowLabel(config = readAppConfig()) {
  const { timingWindow } = config;
  if (timingWindow?.start && timingWindow?.end) {
    return `${timingWindow.start}-${timingWindow.end} (configured)`;
  }
  return 'Best window not configured yet.';
}

export function toggleAnalyticsReports(enabled) {
  const config = readAppConfig();
  persistAppConfig({
    analytics: {
      ...(config.analytics || {}),
      enableReports: Boolean(enabled)
    }
  });
}
