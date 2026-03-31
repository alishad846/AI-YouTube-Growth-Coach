export function learnPatterns(videos = []) {
  const hourBuckets = {};
  const durationSamples = [];
  const mistakes = new Set();
  let improvement = { engagement: 0, growth: 0 };
  let totalSnapshots = 0;
  let bestScoreVideo = null;

  videos.forEach((video) => {
    const snapshots = Array.isArray(video.snapshots) ? video.snapshots : [];
    const scoredSnapshots = snapshots.filter((snap) => snap.performanceScore != null);
    if (scoredSnapshots.length === 0) return;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const engagementDelta = (last.features?.engagementRate || 0) - (first.features?.engagementRate || 0);
    const growthDelta = (last.features?.growthRate || 0) - (first.features?.growthRate || 0);
    improvement.engagement += engagementDelta;
    improvement.growth += growthDelta;

    scoredSnapshots.forEach((snapshot) => {
      totalSnapshots += 1;
      const hour = new Date(snapshot.timestamp).getHours();
      const bucket = hourBuckets[hour] || { score: 0, count: 0 };
      hourBuckets[hour] = {
        score: bucket.score + (snapshot.performanceScore || 0),
        count: bucket.count + 1
      };

      if (snapshot.features?.engagementRate < 0.05) {
        mistakes.add('Hook/CTA not resonating (low engagement).');
      }
      if (snapshot.features?.growthRate < 0.01) {
        mistakes.add('Growth cadence too slow; upload cadence may be inconsistent.');
      }

      if (!bestScoreVideo || (snapshot.performanceScore || 0) > bestScoreVideo.score) {
        bestScoreVideo = {
          videoId: video.videoId,
          score: snapshot.performanceScore || 0,
          timestamp: snapshot.timestamp
        };
      }
    });

    if (video.duration && video.duration > 0) {
      durationSamples.push(video.duration);
    }
  });

  const bestHourEntry = Object.entries(hourBuckets).reduce((best, [hour, { score, count }]) => {
    const average = count ? score / count : 0;
    return average > best.average ? { hour: Number(hour), average } : best;
  }, { hour: null, average: 0 });

  const bestHourLabel = bestHourEntry.hour !== null ? `${bestHourEntry.hour}:00-${bestHourEntry.hour + 1}:00` : 'Not enough data';

  const averageDuration =
    durationSamples.length > 0
      ? durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length
      : null;
  const durationLabel = averageDuration ? `${averageDuration.toFixed(1)} mins` : 'Undetermined';

  return {
    bestTiming: {
      label: bestHourLabel,
      evidence: bestHourEntry.average ? `Avg. score ${bestHourEntry.average.toFixed(1)} at hour ${bestHourEntry.hour}` : 'Insufficient history'
    },
    bestDuration: {
      label: durationLabel,
      evidence: durationSamples.length ? `${durationSamples.length} sample(s) shaped this signal.` : 'Duration has not yet been captured.'
    },
    repeatedMistakes: Array.from(mistakes),
    improvementTracking: {
      engagement: improvement.engagement.toFixed(3),
      growth: improvement.growth.toFixed(3),
      observations: `Across ${totalSnapshots} snapshots we are ${improvement.engagement >= 0 ? 'gaining' : 'losing'} engagement and ${improvement.growth >= 0 ? 'gaining' : 'losing'} growth.`
    },
    hotSpot: bestScoreVideo ? `Most momentum on ${bestScoreVideo.videoId} at ${bestScoreVideo.timestamp}` : 'No high-performing spot yet.'
  };
}
