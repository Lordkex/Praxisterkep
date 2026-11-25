import { describe, expect, it } from 'vitest';
import { competitionRank } from './rank';
import { ranking, type EuIndicator } from './europe';

describe('competitionRank', () => {
  it('gives equal values one place and skips the places they fill', () => {
    const v = [30, 20, 20, 10];
    expect(v.map((x) => competitionRank(v, x, 'higherFirst'))).toEqual([1, 2, 2, 4]);
    expect(v.map((x) => competitionRank(v, x, 'lowerFirst'))).toEqual([4, 2, 2, 1]);
  });

  it('does not depend on the order the rows come in', () => {
    expect(competitionRank([20, 10, 30, 20], 20, 'higherFirst')).toBe(2);
  });

  it('reads a mean that differs only by float noise as a tie', () => {
    const a = (0.1 + 0.2 + 0.3) / 3;
    const b = (0.3 + 0.2 + 0.1) / 3;
    expect(a).not.toBe(b);
    expect([a, b].map((x) => competitionRank([a, b], x, 'higherFirst'))).toEqual([1, 1]);
  });

  it('holds for the European ranking too', () => {
    const ind = {
      better: 'higher', sourceByGeo: {},
      values: { HU: { 2024: 5 }, AT: { 2024: 9 }, SK: { 2024: 5 }, CZ: { 2024: 1 } },
    } as unknown as EuIndicator;
    expect(ranking(ind, ['HU', 'AT', 'SK', 'CZ']).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});
