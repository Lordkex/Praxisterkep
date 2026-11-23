import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strip } from '../build/allowlist.ts';
import { countyRanking, diffRows, longestVacant, nationalRow, statusIn } from '../src/analyses.ts';
import type { Kind, Snapshot } from '../src/types.ts';

const fx = (p: string): Snapshot =>
  strip(JSON.parse(readFileSync(new URL(`./fixtures/data/${p}.json`, import.meta.url), 'utf8')), p).json;
const root = new URL('../../../data/', import.meta.url);

describe('analyses', () => {
  it('national rows equal timeseries.json', () => {
    const ts = JSON.parse(readFileSync(new URL('timeseries.json', root), 'utf8'));
    let n = 0;
    for (const m of readdirSync(root).filter((d) => /^20\d\d-\d\d$/.test(d))) {
      for (const kind of ['gp', 'dental'] as Kind[]) {
        const f = new URL(`${m}/${kind}.json`, root);
        if (!existsSync(f)) continue;
        const s = strip(JSON.parse(readFileSync(f, 'utf8')), `${m}/${kind}`).json;
        const t = ts.kinds[kind].find((r: { month: string }) => r.month === m);
        expect(t, `${m} ${kind}`).toBeTruthy();
        const r = nationalRow(s);
        for (const k of ['totalDistricts', 'vacant', 'dissolved', 'populationVacant', 'populationDissolved'] as const)
          expect(r[k], `${m} ${kind} ${k}`).toBe(t[k]);
        n++;
      }
    }
    expect(n).toBe(59);
  });

  it('county ranking shares tied places', () => {
    const s = fx('2026-11/gp');
    const rates = [0.2, 0.1, 0.1, 0.05];
    s.counties = rates.map((r, i) => ({ ...s.counties[0], name: `C${i}`, vacancyRate: r }));
    expect(countyRanking(s).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('county ranking leaves null rates unranked', () => {
    const s = fx('2026-11/gp');
    s.counties = [
      { ...s.counties[0], name: 'N', vacancyRate: null },
      { ...s.counties[0], name: 'A', vacancyRate: 0.1 },
    ];
    const r = countyRanking(s);
    expect(r.map((x) => x.name)).toEqual(['A', 'N']);
    expect(r[1].rank).toBeNull();
  });

  it('longest vacant counts whole months', () => {
    const s = fx('2026-11/gp');
    s.month = '2017-10';
    s.praxes = [{ ...s.praxes[0], status: 'vacant', vacantSince: '2013-07' }];
    expect(longestVacant(s)[0].months).toBe(51);
  });

  it('history marks months without a registry unknown', () => {
    const d = fx('2026-11/dental');
    expect(statusIn(d, 'DE999999')).toBe('unknown');
    expect(statusIn(d, 'DE000001')).toBe('vacant');
    const g = fx('2026-11/gp');
    expect(statusIn(g, 'GP000001')).toBe('filled');
    expect(statusIn(g, 'GP777777')).toBe('absent');
  });

  it('diffRows lists status changes by id', () => {
    expect(diffRows(fx('2026-10/gp'), fx('2026-11/gp'))).toEqual([
      { id: 'GP000001', from: 'vacant', to: 'filled' },
      { id: 'GP000005', from: 'filled', to: 'vacant' },
    ]);
  });
});
