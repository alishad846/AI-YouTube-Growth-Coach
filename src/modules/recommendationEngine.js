export function generateRecommendations({ diagnosis, patterns, customRecommendations = [] }) {
  const recommendations = [];

  if (diagnosis.rootCause.includes('Engagement')) {
    recommendations.push('Refresh your hook/first 10 seconds to invite likes, comments, and watch time.');
    recommendations.push('Ask for a clear CTA that feels native to the story instead of a generic reminder.');
  }

  if (diagnosis.rootCause === 'Hook tension missing') {
    recommendations.push('Lead with a curiosity question and promise a payoff within the first 15 seconds so the hook holds viewers.');
  }

  if (diagnosis.rootCause === 'CTA lacks payoff') {
    recommendations.push('Echo the hook tension in your closing CTA so viewers feel the reward expectation and keep watching.');
  }

  if (diagnosis.rootCause === 'Upload timing mismatch') {
    recommendations.push('Align the next upload with your configured timing window so the algorithm sees consistent cadence.');
  }

  if (diagnosis.rootCause.includes('Growth')) {
    recommendations.push('Re-energize promotion: share the video in the next newsletter, community tab, or Shorts teaser.');
    recommendations.push('Map the video to a playlist or series so YouTube can push it to related audiences.');
  }

  if (diagnosis.rootCause.includes('Velocity')) {
    recommendations.push('Double down on the next 24 hours: drop a Short or highlight to keep new viewers engaged.');
  }

  if (patterns.repeatedMistakes.length) {
    patterns.repeatedMistakes.forEach((mistake) => {
      recommendations.push(`Pattern detected: ${mistake}`);
    });
  }

  if (patterns.bestTiming.label && !patterns.bestTiming.label.includes('Not enough')) {
    recommendations.push(`Try publishing around ${patterns.bestTiming.label} to align with your best-performing cadence.`);
  }

  if (patterns.bestDuration.label && patterns.bestDuration.label !== 'Undetermined') {
    recommendations.push(`Keep new uploads near ${patterns.bestDuration.label} because that duration has scored best so far.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep the current process; invest in storytelling depth or series-based continuity.');
  }

  const customMatches = (customRecommendations || []).filter((rule) =>
    rule.trigger === 'any' || rule.trigger === diagnosis.category
  );
  customMatches.forEach((rule) => {
    if (rule.message) {
      recommendations.push(rule.message);
    } else if (rule.title) {
      recommendations.push(rule.title);
    }
  });

  return recommendations;
}
