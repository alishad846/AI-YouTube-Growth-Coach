function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
}

export function calculateDelta(current, previous) {
  const deltaViews = safeNumber(current.views) - safeNumber(previous?.views);
  const deltaLikes = safeNumber(current.likes) - safeNumber(previous?.likes);
  const deltaComments = safeNumber(current.comments) - safeNumber(previous?.comments);
  return {
    deltaViews,
    deltaLikes,
    deltaComments
  };
}

export function calculateVelocity(deltaViews, deltaMillis) {
  if (!deltaMillis || deltaMillis <= 0) {
    return 0;
  }
  const hours = deltaMillis / (1000 * 60 * 60);
  return deltaViews / Math.max(hours, 0.25);
}

export function createSnapshot(rawStats, features, context = {}) {
  const timestamp = new Date().toISOString();
  return {
    views: rawStats.stats.viewCount,
    likes: rawStats.stats.likeCount,
    comments: rawStats.stats.commentCount,
    timestamp,
    features: { ...features },
    context,
    performanceScore: features.performanceScore
  };
}

function clampGrowthRate(value) {
  const rate = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(rate, 0), 1);
}

export function buildGrowthDelta(currentSnapshot, previousSnapshot) {
  const delta = calculateDelta(currentSnapshot, previousSnapshot);
  const currentTimestamp = new Date(currentSnapshot.timestamp).getTime();
  const prevTimestamp = previousSnapshot?.timestamp ? new Date(previousSnapshot.timestamp).getTime() : null;
  const deltaMillis = prevTimestamp ? Math.max(currentTimestamp - prevTimestamp, 0) : 0;
  const velocity = calculateVelocity(delta.deltaViews, deltaMillis);
  const expectedViews = previousSnapshot?.views
    ? Math.round(previousSnapshot.views * (1 + clampGrowthRate(previousSnapshot.features?.growthRate)))
    : null;
  const variance = expectedViews !== null ? currentSnapshot.views - expectedViews : null;
  return {
    ...delta,
    deltaMillis,
    velocity,
    expectedViews,
    variance,
    actualViews: currentSnapshot.views
  };
}
