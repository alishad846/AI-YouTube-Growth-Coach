import assert from 'assert/strict';
import { calculateEngagementRate, calculateGrowthRate, calculatePerformanceScore } from '../src/modules/featureEngineering.js';
import { buildGrowthDelta } from '../src/modules/growthSnapshotEngine.js';
import { LocalStorageManager } from '../src/modules/localStorageManager.js';
import { analyzeDiagnosis } from '../src/modules/analysisEngine.js';
import { detectAlerts } from '../src/modules/alertEngine.js';
import { generateRecommendations } from '../src/modules/recommendationEngine.js';
import { addCustomRecommendation, getAppConfig, removeCustomRecommendation } from '../src/modules/appConfig.js';

console.log('Running unit + snapshot checks...');

const engagement = calculateEngagementRate({ views: 1200, likes: 72, comments: 18 });
assert(Math.abs(engagement - (90 / 1200)) < 1e-6, 'Engagement rate should match likes+comments/views.');

const growthRate = calculateGrowthRate(1500, 1000);
assert.strictEqual(growthRate, 0.5, 'Growth should be 50% when views rise from 1k to 1.5k.');

const score = calculatePerformanceScore({ engagementRate: 0.1, growthRate: 0.2, velocity: 90 });
assert(score >= 0 && score <= 100, 'Performance score should stay within 0-100.');

const deltaNoPrev = buildGrowthDelta({ views: 0, likes: 0, comments: 0, timestamp: new Date().toISOString() }, null);
assert.strictEqual(deltaNoPrev.deltaViews, 0, 'Delta views without prior snapshot should be zero.');

LocalStorageManager.saveVideo({ videoId: 'test-video', title: 'Test Video' });
LocalStorageManager.addSnapshot('test-video', {
  views: 100,
  likes: 4,
  comments: 2,
  timestamp: new Date(Date.now() - 3600000).toISOString(),
  features: { engagementRate: 0.06, growthRate: 0.02 },
  performanceScore: 42
});
LocalStorageManager.addSnapshot('test-video', {
  views: 180,
  likes: 20,
  comments: 6,
  timestamp: new Date().toISOString(),
  features: { engagementRate: 0.14, growthRate: 0.12 },
  performanceScore: 68
});

const savedSnapshots = LocalStorageManager.getSnapshots('test-video');
assert.strictEqual(savedSnapshots.length, 2, 'Two snapshots should have been stored.');
const latest = LocalStorageManager.getLatestSnapshot('test-video');
assert.strictEqual(latest.views, 180, 'Latest snapshot should reflect the newest view count.');

const growthDelta = buildGrowthDelta(latest, savedSnapshots[0]);
assert.strictEqual(growthDelta.deltaViews, 80, 'Growth delta must match the view difference between snapshots.');

const unrealisticPrev = {
  views: 100,
  likes: 0,
  comments: 0,
  timestamp: new Date(Date.now() - 7200000).toISOString(),
  features: { growthRate: 1000 },
  performanceScore: 90
};
const clampDelta = buildGrowthDelta({ views: 150, likes: 5, comments: 2, timestamp: new Date().toISOString() }, unrealisticPrev);
assert.strictEqual(clampDelta.expectedViews, 200, 'Expected views should cap high growth rate at 100% before estimating.');

console.log('All calculation and snapshot tests passed.');

const testConfig = getAppConfig();
assert(typeof testConfig.thresholds.engagement === 'number', 'Engagement threshold always exists in config.');

const customRulesBefore = testConfig.customRecommendations.length;
const updatedRules = addCustomRecommendation({
  trigger: 'engagement',
  title: 'Push the hook',
  message: 'Rework the first 10 seconds when engagement falls.'
});
const addedRule = updatedRules.find((rule) => rule.title === 'Push the hook');
assert(addedRule, 'Custom rule should be added to the config.');

const diagnosis = analyzeDiagnosis({
  features: { engagementRate: 0.01, growthRate: 0.01, velocity: 20 },
  growth: { deltaViews: -10, velocity: 20 },
  config: getAppConfig(),
  snapshots: savedSnapshots,
  video: { lastCheck: '2026-03-30T19:00:00Z' }
});
assert(diagnosis.category === 'engagement', 'Low engagement should surface an engagement diagnosis.');

const recommendations = generateRecommendations({
  diagnosis,
  patterns: {
    bestTiming: { label: 'N/A', evidence: '' },
    bestDuration: { label: 'N/A', evidence: '' },
    repeatedMistakes: [],
    improvementTracking: { engagement: 0, growth: 0, observations: '' },
    hotSpot: 'N/A'
  },
  customRecommendations: getAppConfig().customRecommendations
});
assert(recommendations.includes('Rework the first 10 seconds when engagement falls.'), 'Custom guidance should surface when triggers match.');

const timingDiagnosis = analyzeDiagnosis({
  features: { engagementRate: 0.08, growthRate: 0.12, velocity: 60 },
  growth: { deltaViews: 140, velocity: 60 },
  config: getAppConfig(),
  snapshots: savedSnapshots,
  video: { lastCheck: '2026-03-30T03:00:00Z' }
});
assert.strictEqual(timingDiagnosis.rootCause, 'Upload timing mismatch', 'Timing mismatch should surface when last check is outside the window.');

const alerts = detectAlerts({
  features: { engagementRate: 0.02, growthRate: -0.05, velocity: 10 },
  growth: { deltaViews: -25, velocity: 10 },
  config: getAppConfig(),
  snapshots: [],
  source: 'live'
});
assert(alerts.length >= 1, 'Alert engine should produce at least one warning for poor metrics.');

removeCustomRecommendation(addedRule.id);
const restoredRules = getAppConfig().customRecommendations.length;
assert(restoredRules === customRulesBefore, 'Custom rules count should revert after removal.');

console.log('Configuration, recommendations, and alert engines behave as expected.');
