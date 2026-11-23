import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { strip } from '../build/allowlist.ts';
import { toCsv } from '../src/csv.ts';
import { createClient } from '../src/client.ts';
import { run } from '../src/cli.ts';
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
files['manifest.json'] = JSON.stringify({
  package: 'hungarian-praxismap', version: '2026.11.0', built: 'x', commit: 'x',
  conceptDoi: '10.5281/zenodo.23460426', tag: 'data-2026.11.0', licences: { code: 'MIT', data: 'CC-BY-4.0', coordinates: 'ODbL-1.0' }, disclaimer: 'x', months: entries,
} satisfies Manifest);

async function go(...argv: string[]) {
  const client = createClient(async (p) => {
    if (files[p] === undefined) throw new Error(`missing ${p}`);
    return files[p];
  });
  let out = '', err = '';
  const code = await run(argv, client, (s) => (out += s), (s) => (err += s));
  return { code, out, err };
}

describe('cli', () => {
  it('counties prints a ranked CSV', async () => {
    const r = await go('counties', '2026-11');
    expect(r.code).toBe(0);
    expect(r.out.startsWith('rank,name,vacant,total,vacancyRate\n')).toBe(true);
  });
  it('months, national, longest, history', async () => {
    expect((await go('months')).out).toBe('month\n2026-10\n2026-11\n');
    expect((await go('months', '--kind', 'dental')).out).toBe('month\n2026-11\n');
    expect((await go('national')).out.split('\n')[0]).toMatch(/^month,kind,totalDistricts,vacant/);
    expect((await go('longest', '2026-11', '--limit', '1')).out.trim().split('\n')).toHaveLength(2);
    expect((await go('history', 'X')).out.startsWith('month,kind,status\n')).toBe(true);
  });
  it('diff has a header and only changed ids', async () => {
    const r = await go('diff', '2026-10', '2026-11');
    expect(r.code).toBe(0);
    const [head, ...rows] = r.out.trim().split('\n');
    expect(head).toBe('id,from,to');
    for (const row of rows) { const [, a, b] = row.split(','); expect(a).not.toBe(b); }
  });
  it('verify exits 0', async () => {
    const r = await go('verify');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^ok \d+\n$/);
  });
  it('help exits 0, unknown exits 2 with usage on stderr', async () => {
    expect((await go()).code).toBe(0);
    const r = await go('nonsense');
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/Usage/);
    expect(r.out).toBe('');
  });
  it('an unarchived month exits 1 naming the available months', async () => {
    const r = await go('counties', '2018-01');
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/2018-01/);
    expect(r.err).toMatch(/2026-11/);
  });
  it('rejects missing arguments and a bad kind', async () => {
    expect((await go('counties')).code).toBe(2);
    expect((await go('national', '--kind', 'x')).code).toBe(2);
  });
});
