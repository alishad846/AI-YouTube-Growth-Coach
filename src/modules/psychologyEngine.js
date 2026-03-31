export function analyzePsychologyTriggers({ features, growth }) {
  return {
    missingCuriosityGap: features.engagementRate < 0.05,
    missingEmotionalHook: features.engagementRate < 0.04,
    missingRewardExpectation: growth.velocity < 50
  };
}
