function formatLargeNumber(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  const num = Number(value);
  const abs = Math.abs(num);
  if (abs >= 1e12) {
    return `${(num / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(num);
}

export function formatReport({ video, features, growth, diagnosis, patterns, recommendations, analytics, rangeStart, rangeEnd }) {
  const lastCheck = video?.lastCheck || 'Never';
  const videoLabel = (video?.title?.trim() || "This video");
  const analyticsSummary = analytics
    ? `Impressions ${analytics.impressions?.toLocaleString() || '0'}, CTR ${(analytics.ctr || 0).toFixed(2)}%, ${(
      analytics.watchMinutes || 0
    ).toFixed(1)} watch minutes reported via analytics.`
    : 'Analytics connector is disabled or not configured; rely on the YouTube Data API key only.';
  return {
    performanceSummary: `As of ${lastCheck}, ${videoLabel} sits at ${Math.round(features.performanceScore || 0)}/100. Engagement is ${
      (features.engagementRate || 0).toFixed(3)} and growth delta ${growth.deltaViews || 0} views.`,
    scoreBreakdown: {
      performanceScore: features.performanceScore,
      engagementRate: features.engagementRate,
      growthRate: features.growthRate,
      velocity: growth.velocity
    },
    evidence: `Views ${growth.deltaViews >= 0 ? 'gained' : 'lost'} ${Math.abs(growth.deltaViews)} since ${video?.lastCheck}. Engagement is ${
      (features.engagementRate || 0).toFixed(3)} vs base benchmark.`,
    rootCause: {
      message: diagnosis.rootCause,
      confidence: `${diagnosis.confidence || 60}% confidence`,
      detail: diagnosis.detail || ''
    },
    actionableRecommendations: recommendations,
    analyticsSummary,
    analytics: analytics || null,
    growthComparison: {
      deltaViews: growth.deltaViews,
      velocity: growth.velocity,
      expectedViews: growth.expectedViews,
      expectedViewsFormatted: formatLargeNumber(growth.expectedViews),
      actualViews: growth.actualViews,
      actualViewsFormatted: formatLargeNumber(growth.actualViews),
      variance: growth.variance,
      varianceFormatted: formatLargeNumber(growth.variance),
      timestamp: video?.lastCheck,
      range: {
        start: rangeStart,
        end: rangeEnd
      }
    },
    patterns: {
      bestTiming: patterns.bestTiming,
      bestDuration: patterns.bestDuration,
      repeatedMistakes: patterns.repeatedMistakes,
      improvementTracking: patterns.improvementTracking,
      hotSpot: patterns.hotSpot
    }
  };
}
