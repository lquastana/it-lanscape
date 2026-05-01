import { DIMENSIONS, SEVERITY_WEIGHT } from './constants.js';
import { roundScore } from './helpers.js';

export function createDimensionState() {
  return Object.fromEntries(
    Object.keys(DIMENSIONS).map(key => [key, { passed: 0, total: 0 }]),
  );
}

export function computeScores(dimensions) {
  const byDimension = Object.fromEntries(
    Object.entries(DIMENSIONS).map(([key, config]) => {
      const state = dimensions[key];
      const score = state.total === 0 ? 100 : roundScore((state.passed / state.total) * 100);
      return [key, {
        ...config,
        score,
        passed: state.passed,
        total: state.total,
      }];
    }),
  );

  const weightedScore = Object.entries(byDimension).reduce(
    (sum, [, dimension]) => sum + dimension.score * dimension.weight,
    0,
  );

  return {
    global: roundScore(weightedScore),
    dimensions: byDimension,
  };
}

export function issueSort(a, b) {
  const severityDelta = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
  if (severityDelta !== 0) return severityDelta;
  return String(a.title).localeCompare(String(b.title));
}
