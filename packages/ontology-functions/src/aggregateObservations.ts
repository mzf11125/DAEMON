export function aggregateObservations(
  observations: Array<{ value: number }>,
): { count: number; avg: number; max: number } {
  if (observations.length === 0) {
    return { count: 0, avg: 0, max: 0 };
  }
  let sum = 0;
  let max = observations[0].value;
  for (const o of observations) {
    sum += o.value;
    if (o.value > max) max = o.value;
  }
  return { count: observations.length, avg: sum / observations.length, max };
}
