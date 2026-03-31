import { analyzePsychologyTriggers } from './psychologyEngine.js';

const DEFAULT_BENCHMARKS = {
  engagement: 0.06,
  growth: 0.02
};

function deriveConfidence(score) {
  return Math.round(Math.min(Math.max(score * 100, 20), 90));
}

function detectHookFailure({ features, growth }) {
  return features.engagementRate < 0.05 && growth.velocity < 45;
}

function detectCTAIssue({ growth, snapshots }) {
  return (
    growth.deltaViews > 0 &&
    growth.velocity < 50 &&
    Array.isArray(snapshots) &&
    snapshots.length >= 2
  );
}

function parseHour(value) {
  if (!value) return null;
  const [hour] = value.split(':');
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHourFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getHours();
  return Number.isFinite(hour) ? hour : null;
}

function detectTimingMismatch({ video, config }) {
  const timing = config.timingWindow || {};
  if (!video || !video.lastCheck || !timing.start || !timing.end) {
    return false;
  }
  const lastHour = getHourFromTimestamp(video.lastCheck);
  const startHour = parseHour(timing.start);
  const endHour = parseHour(timing.end);
  if (lastHour === null || startHour === null || endHour === null) {
    return false;
  }
  const insideWindow =
    startHour < endHour
      ? lastHour >= startHour && lastHour < endHour
      : lastHour >= startHour || lastHour < endHour;
  return !insideWindow;
}

export function analyzeDiagnosis({ features, growth, config = {}, snapshots = [], video = {} }) {
  const benchmarks = { ...DEFAULT_BENCHMARKS, ...(config.thresholds || {}) };
  const issueConfig = config.anomalies || {};
  const issues = [];

  if (features.engagementRate < benchmarks.engagement) {
    issues.push({
      rootCause: 'Engagement below your benchmark',
      detail: 'The audience is not interacting enough with the hook or CTA.',
      severity: (benchmarks.engagement - features.engagementRate) / Math.max(benchmarks.engagement, 0.01),
      category: 'engagement'
    });
  }

  if (features.growthRate < benchmarks.growth) {
    issues.push({
      rootCause: 'Growth is stagnating',
      detail: 'Views are not rising fast enough compared to prior snapshots.',
      severity: (benchmarks.growth - features.growthRate) / Math.max(benchmarks.growth, 0.01),
      category: 'growth'
    });
  }

  const velocityFloor = Math.max(10, issueConfig.velocityDrop || 50);
  if (growth.velocity && growth.velocity < velocityFloor) {
    issues.push({
      rootCause: 'Velocity slowdown',
      detail: 'The rate of new views per hour has dipped, indicating momentum loss.',
      severity: Math.max(0, (velocityFloor - growth.velocity) / velocityFloor),
      category: 'velocity'
    });
  }

  if (detectHookFailure({ features, growth })) {
    issues.push({
      rootCause: 'Hook tension missing',
      detail: 'Early hook fails to create a curiosity gap, so retention collapses before the payoff.',
      severity: Math.max(0, (0.05 - features.engagementRate) / 0.05),
      category: 'hook'
    });
  }

  if (detectCTAIssue({ growth, snapshots })) {
    issues.push({
      rootCause: 'CTA lacks payoff',
      detail: 'Velocity dips after the spike because no reward expectation drives action.',
      severity: Math.max(0, (50 - growth.velocity) / 50),
      category: 'cta'
    });
  }

  if (detectTimingMismatch({ video, config })) {
    const timing = config.timingWindow || {};
    issues.push({
      rootCause: 'Upload timing mismatch',
      detail: `Last check ${video.lastCheck} is outside configured window ${timing.start}-${timing.end}.`,
      severity: 0.35,
      category: 'timing'
    });
  }

  if (issues.length === 0) {
    return {
      rootCause: 'Healthy growth signal',
      confidence: 60,
      detail: 'Performance is above baseline; keep iterating the positive signals.',
      category: 'healthy'
    };
  }

  const strongest = issues.reduce((prev, current) => (current.severity > prev.severity ? current : prev));
  const psychology = analyzePsychologyTriggers({ features, growth });
  return {
    rootCause: strongest.rootCause,
    confidence: deriveConfidence(strongest.severity),
    detail: strongest.detail,
    category: strongest.category,
    psychology
  };
}
