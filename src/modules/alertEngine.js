export function detectAlerts({ features = {}, growth = {}, config = {}, snapshots = [], source = 'live' }) {
  const alerts = [];
  const anomalies = config.anomalies || {};
  const engagementFloor = anomalies.engagementDrop ?? 0.045;
  const growthFloor = anomalies.growthDrop ?? 0.015;
  const velocityFloor = anomalies.velocityDrop ?? 40;

  if (growth.deltaViews < 0) {
    alerts.push('Views declined since the last check—consider refreshing promotion or thumbnail.');
  }

  if (features.engagementRate < engagementFloor) {
    alerts.push(`Engagement dropped below ${engagementFloor.toFixed(3)}; revisit hooks, descriptions, or CTAs.`);
  }

  if (features.growthRate < growthFloor) {
    alerts.push(`Growth rate below ${growthFloor.toFixed(3)}—you may need a new push or playlist alignment.`);
  }

  if (growth.velocity > 0 && growth.velocity < velocityFloor) {
    alerts.push(`Velocity is ${Math.round(growth.velocity)} views/hr—momentum is slowing (threshold ${velocityFloor}).`);
  }

  if (source === 'analytics' && config.analytics?.enableReports) {
    alerts.push('Analytics connector is active; insights include impression and CTR signals.');
  }

  if (snapshots.length <= 1) {
    alerts.push('Only one snapshot exists; capture another run to build reliable trends.');
  }

  return alerts;
}
