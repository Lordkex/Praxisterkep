import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strip } from '../build/allowlist.ts';
import { COORDINATE_COLUMNS, TABLES } from '../src/tables.ts';
import type { Snapshot } from '../src/types.ts';

const load = (url: URL, where: string): Snapshot => strip(JSON.parse(readFileSync(url, 'utf8')), where).json;
const fixture = load(new URL('./fixtures/data/2026-11/gp.json', import.meta.url), 'fixture');

describe('tables', () => {
  it('have one praxes row per site', () => {
    const sites = fixture.praxes.reduce((n, p) => n + p.sites.length, 0);
    expect(TABLES.praxes.rows(fixture)).toHaveLength(sites);
  });

  it('never carry a name or coordinate column', () => {
    for (const t of Object.values(TABLES))
      for (const bad of ['doctor', 'provider', 'lat', 'lon']) expect(t.columns).not.toContain(bad);
    expect(COORDINATE_COLUMNS).toEqual(['id', 'siteIndex', 'lat', 'lon', 'geoApprox']);
  });

  it('use only their declared columns', () => {
    for (const t of Object.values(TABLES))
      for (const row of t.rows(fixture)) expect(Object.keys(row).every((k) => t.columns.includes(k))).toBe(true);
  });

  it('settlements count vacant ids', () => {
    const rows = TABLES.settlements.rows(fixture);
    rows.forEach((r, i) => expect(r.vacant).toBe(fixture.settlements[i].vacantPraxisIds.length));
  });

  it('counties table matches the snapshot', () => {
    const real = load(new URL('../../../data/2026-11/gp.json', import.meta.url), 'data/2026-11/gp.json');
    const sum = TABLES.counties.rows(real).reduce((n, r) => n + (r.vacant as number), 0);
    expect(sum).toBe(real.national.vacant);
  });
});
