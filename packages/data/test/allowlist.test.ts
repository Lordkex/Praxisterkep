import { readFileSync, globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALLOWLIST, DROPPED, MOVED, schemaFrom, strip } from '../build/allowlist.ts';

const fixture = (month: string, kind: string): any =>
  JSON.parse(readFileSync(new URL(`./fixtures/data/${month}/${kind}.json`, import.meta.url), 'utf8'));

describe('strip', () => {
  it('removes names and coordinates', () => {
    const input = fixture('2026-10', 'gp');
    expect(JSON.stringify(input)).toContain('Teszt Elek');
    const { json, coordinates } = strip(input, '2026-10/gp.json');
    const out = JSON.stringify(json);
    expect(out).not.toContain('Teszt Elek');
    expect(out).not.toContain('Teszt Bt.');
    expect(out).not.toContain('"lat"');
    expect(out).not.toContain('"lon"');
    expect(out).toContain('Dr. Pikó Béla u. 3.');
    expect(out).toContain('"geoApprox"');
    const sites = input.praxes.flatMap((p: any) => p.sites.map((s: any, i: number) => ({ id: p.id, i, s })));
    expect(coordinates).toHaveLength(sites.length);
    for (const row of coordinates) {
      const src = input.praxes.find((p: any) => p.id === row.id).sites[row.siteIndex];
      expect(row.lat).toBe(src.lat);
      expect(row.lon).toBe(src.lon);
      expect(row.geoApprox).toBe(src.geoApprox);
    }
  });

  it('gives no coordinate row to a site without lat/lon', () => {
    const input = fixture('2026-11', 'gp');
    const { coordinates } = strip(input, '2026-11/gp.json');
    expect(input.praxes).toHaveLength(3);
    expect(coordinates.map((c) => c.id)).not.toContain('GP000005');
    expect(coordinates).toHaveLength(3);
  });

  it('fails when a site has only one of lat/lon', () => {
    const input = fixture('2026-10', 'gp');
    delete input.praxes[0].sites[0].lon;
    expect(() => strip(input, '2026-10/gp.json')).toThrow(/only one of lat\/lon/);
  });

  it('fails when a site has coordinates but no geoApprox', () => {
    const input = fixture('2026-10', 'gp');
    delete input.praxes[0].sites[0].geoApprox;
    expect(() => strip(input, '2026-10/gp.json')).toThrow(/2026-10\/gp\.json.*geoApprox missing/);
  });

  it('uses the site index within the praxis', () => {
    const { coordinates } = strip(fixture('2026-10', 'gp'), 'x');
    expect(coordinates.filter((c) => c.id === 'GP000002').map((c) => c.siteIndex)).toEqual([0, 1]);
  });

  it('fails on an unknown field', () => {
    const input = fixture('2026-11', 'gp');
    input.filledPraxes[0].phone = 'x';
    expect(() => strip(input, '2026-11/gp.json')).toThrow(/2026-11\/gp\.json.*filledPraxes\[\]\.phone/);
  });

  it('fails on an unknown field at the top level and in a site', () => {
    const a = fixture('2026-11', 'gp');
    a.extra = 1;
    expect(() => strip(a, 'w')).toThrow(/extra/);
    const b = fixture('2026-11', 'gp');
    b.praxes[0].sites[0].contact = 'x';
    expect(() => strip(b, 'w')).toThrow(/praxes\[\]\.sites\[\]\.contact/);
  });

  it('fails on a wrong type', () => {
    const input = fixture('2026-11', 'gp');
    input.national.vacant = '3';
    expect(() => strip(input, '2026-11/gp.json')).toThrow(/national\.vacant/);
    const f = fixture('2026-11', 'gp');
    f.praxes[0].sites[0].isHeadquarters = 'yes';
    expect(() => strip(f, 'w')).toThrow(/isHeadquarters/);
    const g = fixture('2026-11', 'gp');
    g.counties[0].vacant = 1.5;
    expect(() => strip(g, 'w')).toThrow(/counties\[\]\.vacant/);
  });

  it('fails on a missing required key', () => {
    const input = fixture('2026-11', 'gp');
    delete input.national.vacant;
    expect(() => strip(input, '2026-11/gp.json')).toThrow(/2026-11\/gp\.json.*national\.vacant/);
  });

  it('accepts null and absent optional leaves', () => {
    const input = fixture('2026-10', 'gp');
    expect(input.counties[1].vacancyRate).toBeNull();
    expect(() => strip(input, 'w')).not.toThrow();
    const d = fixture('2026-11', 'dental');
    expect(() => strip(d, 'w')).not.toThrow();
  });

  it('keeps key order and values, and does not mutate the input', () => {
    const input = fixture('2026-10', 'gp');
    const before = JSON.stringify(input);
    const { json } = strip(input, 'w');
    expect(JSON.stringify(input)).toBe(before);
    const expected = structuredClone(input);
    for (const p of expected.praxes) for (const s of p.sites) { delete s.lat; delete s.lon; }
    for (const f of expected.filledPraxes) { delete f.doctor; delete f.provider; }
    expect(json).toEqual(expected);
    expect(JSON.stringify(json)).toBe(JSON.stringify(expected));
  });

  it('names the dropped and moved keys', () => {
    expect(DROPPED).toEqual(['filledPraxes[].doctor', 'filledPraxes[].provider']);
    expect(MOVED).toEqual(['praxes[].sites[].lat', 'praxes[].sites[].lon']);
  });

  it('strips the real archive without error', () => {
    const files = globSync('20*/*.json', { cwd: new URL('../../../data/', import.meta.url).pathname });
    expect(files.length).toBeGreaterThanOrEqual(59);
    for (const f of files) {
      const raw = JSON.parse(readFileSync(new URL(`../../../data/${f}`, import.meta.url), 'utf8'));
      const { json } = strip(raw, f);
      expect(JSON.stringify(json)).not.toMatch(/"(doctor|provider|lat|lon)"/);
    }
  });
});

describe('schemaFrom', () => {
  it('lists every allowed field and no dropped one', () => {
    const s = JSON.stringify(schemaFrom(ALLOWLIST));
    expect(s).toContain('"geoApprox"');
    expect(s).not.toContain('"doctor"');
    expect(s).not.toContain('"provider"');
    expect(s).not.toContain('"lat"');
    expect(s).not.toContain('"lon"');
  });

  it('is a closed JSON Schema 2020-12 object', () => {
    const s: any = schemaFrom(ALLOWLIST);
    expect(s.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(s.additionalProperties).toBe(false);
    expect(s.required).toContain('national');
    expect(s.properties.praxes.items.additionalProperties).toBe(false);
    expect(s.properties.longTermAsOf.type).toEqual(['string', 'null']);
    expect(s.required).not.toContain('longTermAsOf');
    expect(s.properties.counties.items.properties.vacant.type).toBe('integer');
  });
});
