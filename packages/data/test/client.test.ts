import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { strip } from '../build/allowlist.ts';
import { toCsv } from '../src/csv.ts';
import { createClient } from '../src/client.ts';
import { COORDINATE_COLUMNS } from '../src/tables.ts';
import type { Manifest } from '../src/types.ts';

const files: Record<string, string> = {};
const entries: Manifest['months'] = {};
for (const [m, k] of [['2026-10', 'gp'], ['2026-11', 'gp'], ['2026-11', 'dental']] as const) {
  const raw = JSON.parse(readFileSync(new URL(`./fixtures/data/${m}/${k}.json`, import.meta.url), 'utf8'));
  const { json, coordinates } = strip(raw, `${m}/${k}`);
  const put = (path: string, text: string) => {
    files[path] = text;
    (entries[m] ??= {})[k] ??= { schemaVersion: 1, sources: [], longTermAsOf: null, files: {}, raw: null, missingRaw: [] };
    entries[m][k]!.files[path] = { sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) };
  };
  put(`months/${m}/${k}.json`, JSON.stringify(json));
  put(`months/${m}/${k}-coordinates.csv`, toCsv(coordinates as unknown as Record<string, unknown>[], COORDINATE_COLUMNS));
}
const manifest: Manifest = {
  package: 'hungarian-praxismap', version: '2026.11.0', built: 'x', commit: 'x',
  conceptDoi: '10.5281/zenodo.23460426', tag: 'data-2026.11.0',
  licences: { code: 'MIT', data: 'CC-BY-4.0', coordinates: 'ODbL-1.0' }, disclaimer: 'x', months: entries,
};
files['manifest.json'] = JSON.stringify(manifest);

const make = (over: Record<string, string> = {}) => {
  const load = vi.fn(async (p: string) => {
    const t = { ...files, ...over }[p];
    if (t === undefined) throw new Error(`missing ${p}`);
    return t;
  });
  return { load, client: createClient(load) };
};

describe('client', () => {
  it('lists months from the manifest', async () => {
    const { client } = make();
    expect(await client.months('gp')).toEqual(['2026-10', '2026-11']);
    expect(await client.months('dental')).toEqual(['2026-11']);
    expect(await client.months()).toEqual(['2026-10', '2026-11']);
  });

  it('snapshot rejects an unarchived month with the list', async () => {
    const { client, load } = make();
    await client.manifest();
    load.mockClear();
    const err = await client.snapshot('2018-01', 'gp').catch((e: Error) => e);
    expect((err as Error).message).toMatch(/2018-01/);
    expect((err as Error).message).toMatch(/gp/);
    expect((err as Error).message).toMatch(/2026-11/);
    expect(load).not.toHaveBeenCalled();
  });

  it('verify catches a changed file', async () => {
    const ok = await make().client.verify();
    expect(ok).toMatchObject({ ok: true, checked: 6, mismatched: [] });
    const bad = await make({ 'months/2026-11/gp.json': '{}' }).client.verify();
    expect(bad.ok).toBe(false);
    expect(bad.mismatched).toEqual(['months/2026-11/gp.json']);
  });

  it('client loads each snapshot once', async () => {
    const { client, load } = make();
    await client.praxisHistory('GP000001');
    await client.praxisHistory('GP000001');
    const calls = load.mock.calls.map((c) => c[0]);
    expect(new Set(calls).size).toBe(calls.length);
    expect(calls.filter((p) => p.endsWith('.json') && p !== 'manifest.json')).toHaveLength(3);
  });

  it('history covers both branches, sorted', async () => {
    const h = await make().client.praxisHistory('GP000001');
    expect(h).toEqual([
      { month: '2026-10', kind: 'gp', status: 'vacant' },
      { month: '2026-11', kind: 'dental', status: 'unknown' },
      { month: '2026-11', kind: 'gp', status: 'filled' },
    ]);
    expect(await make().client.praxisHistory('GP000001', 'gp')).toHaveLength(2);
  });

  it('national, diff and coordinates', async () => {
    const { client } = make();
    expect((await client.national('gp')).map((r) => r.month)).toEqual(['2026-10', '2026-11']);
    expect(await client.diff('2026-10', '2026-11', 'gp')).toHaveLength(2);
    const c = await client.coordinates('2026-11', 'gp');
    expect(typeof c[0].lat).toBe('number');
    expect(typeof c[0].geoApprox).toBe('boolean');
  });
});
