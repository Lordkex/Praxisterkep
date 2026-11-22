// One rule for every printed place: equal values share it.

// far below the precision of any published figure; only float noise is this small
const EPS = 1e-9;

/**
 * 1 + how many values stand strictly ahead of this one (1, 2, 2, 4). The
 * position in a sorted list is never a rank: two equal values would get two.
 */
export function competitionRank(values: number[], value: number, order: 'higherFirst' | 'lowerFirst'): number {
  const sign = order === 'higherFirst' ? 1 : -1;
  return values.filter((v) => sign * (v - value) > EPS).length + 1;
}
