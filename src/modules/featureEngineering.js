function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
}

export function calculateEngagementRate({ views, likes, comments }) {
  const totalViews = Math.max(safeNumber(views), 1);
  const engagementActions = safeNumber(likes) + safeNumber(comments);
  return engagementActions / totalViews;
}

export function calculateGrowthRate(currentViews, previousViews) {
  const current = safeNumber(currentViews);
  const previous = Math.max(safeNumber(previousViews), 1);
  return (current - previous) / previous;
}

export function calculatePerformanceScore({ engagementRate, growthRate, velocity }) {
  const normalizedEngagement = Math.min(engagementRate / 0.10, 1);
  const normalizedGrowth = Math.min(Math.max(growthRate, 0) / 0.15, 1);
  const normalizedVelocity = Math.min(Math.max(velocity / 100, 0), 1);
  return Math.round(((normalizedEngagement * 0.5 + normalizedGrowth * 0.3 + normalizedVelocity * 0.2) * 100));
}

export function calculatePreUploadScore({ engagementRate, growthRate }) {
  const base = Math.max(engagementRate, 0) * 400;
  const momentum = Math.max(growthRate, 0) * 200;
  return Math.round(Math.min(100, base + momentum));
}
