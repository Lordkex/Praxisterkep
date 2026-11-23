import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { build, assertParseable, assertSafeOutDir } from '../build/build.ts';
import { checkNoCoordinates, guardOutput } from '../build/guard.ts';
import { rawFiles } from '../build/manifest.ts';
import type { Manifest } from '../src/types.ts';

const FIX = new URL('./fixtures/data', import.meta.url).pathname;
const REAL = new URL('../../../data', import.meta.url).pathname;
const tmps: string[] = [];
const tmp = (): string => { const d = mkdtempSync(join(tmpdir(), 'praxis-build-')); tmps.push(d); return d; };
afterAll(() => tmps.forEach((d) => rmSync(d, { recursive: true, force: true })));

const opts = { patch: 0, commit: 'test', committedAt: '2026-11-22T00:00:00+01:00' };
const list = (dir: string, sub = ''): string[] =>
  readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? list(dir, join(sub, e.name)) : [join(sub, e.name)]).sort();
const sha = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');

describe('build on fixtures', () => {
  const out = tmp();
  let result: { version: string; files: number };
  it('writes the expected tree', async () => {
    result = await build({ dataDir: FIX, outDir: out, ...opts });
    const files = list(out).filter((f) => !f.startsWith('lib/'));
    const kinds = (m: string, ks: string[]) => ks.flatMap((k) =>
      ['', '-praxes', '-filled', '-counties', '-settlements', '-coordinates'].map((s) => `months/${m}/${k}${s}.${s ? 'csv' : 'json'}`));
    expect(files).toEqual([
      'CHANGELOG.md', 'LICENSE.md', 'README.md', 'manifest.json',
      ...[...kinds('2026-10', ['gp']), ...kinds('2026-11', ['dental', 'gp'])].sort(),
      'package.json', 'schema/manifest.schema.json', 'schema/snapshot.schema.json',
    ].sort());
    const manifest: Manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(manifest.version).toBe('2026.11.0');
    expect(manifest.tag).toBe('data-2026.11.0');
    expect(manifest.built).toBe(opts.committedAt);
    expect(JSON.parse(readFileSync(join(out, 'package.json'), 'utf8')).version).toBe('2026.11.0');
    expect(existsSync(join(out, 'lib/node.js'))).toBe(true);
    expect(readFileSync(join(out, 'lib/version.js'), 'utf8')).toContain('2026.11.0');
    expect(result.version).toBe('2026.11.0');
    expect(result.files).toBe(list(out).length);
  });

  it('manifest hashes match the files', () => {
    const manifest: Manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    let n = 0;
    for (const byKind of Object.values(manifest.months))
      for (const e of Object.values(byKind)) {
        expect(Object.keys(e.files)).toHaveLength(6);
        for (const [path, f] of Object.entries(e.files)) {
          n++;
          expect(sha(join(out, path))).toBe(f.sha256);
          expect(statSync(join(out, path)).size).toBe(f.bytes);
        }
      }
    expect(n).toBe(18);
  });

  it('names missing raw files', () => {
    const m: Manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(m.months['2026-11'].dental!.raw).toBeNull();
    expect(m.months['2026-11'].dental!.missingRaw).toEqual(['registry', 'vacant']);
    expect(m.months['2026-10'].gp!.raw).toBeNull();
    const gp = m.months['2026-11'].gp!;
    expect(gp.missingRaw).toEqual([]);
    expect(gp.raw!.map((r) => [r.name, r.role])).toEqual([['gp_registry.xls', 'registry'], ['gp_vacant.pdf', 'vacant']]);
    expect(gp.raw![0].url).toBe('https://github.com/ZoliQua/Praxisterkep/blob/test/data/raw/2026-11/gp_registry.xls');
    expect(gp.raw![0].sha256).toBe(sha(join(FIX, 'raw/2026-11/gp_registry.xls')));
  });

  it('is deterministic', async () => {
    const other = tmp();
    await build({ dataDir: FIX, outDir: other, ...opts });
    const a = list(out).filter((f) => !f.startsWith('lib/'));
    expect(list(other).filter((f) => !f.startsWith('lib/'))).toEqual(a);
    for (const f of a) expect(readFileSync(join(other, f)).equals(readFileSync(join(out, f)))).toBe(true);
  });
});

describe('rawFiles roles', () => {
  it('matches exact stems only', () => {
    const d = tmp();
    const dir = join(d, 'raw/2026-11');
    cpSync(join(FIX, 'raw/2026-11'), dir, { recursive: true });
    for (const n of ['gp_vacant_wayback_truncated.pdf', 'gp_vacant_dissolved.pdf', 'okfo_gp.html', 'okfo_dental.html', 'dental_registry.xls', 'pharmacies.xlsx'])
      writeFileSync(join(dir, n), 'x');
    expect(rawFiles(d, '2026-11', 'gp', 'c')!.map((r) => [r.name, r.role])).toEqual([
      ['gp_registry.xls', 'registry'], ['gp_vacant.pdf', 'vacant'], ['gp_vacant_dissolved.pdf', 'dissolved'],
      ['gp_vacant_wayback_truncated.pdf', 'other'], ['okfo_gp.html', 'okfo'],
    ]);
    expect(rawFiles(d, '2026-10', 'gp', 'c')).toBeNull();
  });
});

describe('guard failure', () => {
  it('fails and leaves no package.json', async () => {
    const d = tmp();
    cpSync(FIX, d, { recursive: true });
    const p = join(d, '2026-11/gp.json');
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const settlement = j.settlements[0].name;
    j.filledPraxes[0].provider = settlement;
    writeFileSync(p, JSON.stringify(j));
    const out = tmp();
    await expect(build({ dataDir: d, outDir: out, ...opts })).rejects.toThrow(/Name guard/);
    expect(existsSync(join(out, 'package.json'))).toBe(false);
    expect(existsSync(out) ? readdirSync(out) : []).toEqual([]);
  });

  it('names the file for an unterminated-quote CSV', () => {
    expect(() => assertParseable([{ path: 'months/a-praxes.csv', text: 'a,b\n"1,2\n' }])).toThrow(/^months\/a-praxes\.csv: .*unterminated/);
  });

  it('build prefixes parse errors with the file path', async () => {
    const d = tmp();
    cpSync(FIX, d, { recursive: true });
    writeFileSync(join(d, '2026-11/gp.json'), '{broken');
    await expect(build({ dataDir: d, outDir: tmp(), ...opts })).rejects.toThrow(/2026-11\/gp\.json/);
  });
});

describe('output checks', () => {
  it('rejects a lat key in a months json', () => {
    const files = [{ path: 'months/2026-11/gp.json', text: '{"praxes":[{"sites":[{"lat":47.1}]}]}' }];
    expect(() => checkNoCoordinates(files)).toThrow(/months\/2026-11\/gp\.json \/praxes\/0\/sites\/0\/lat/);
    expect(() => checkNoCoordinates([{ path: 'months/a.json', text: '{"x":1}' }])).not.toThrow();
  });

  it('refuses an ancestor, the repo, the data dir and a foreign non-empty dir', () => {
    expect(() => assertSafeOutDir('..', FIX)).toThrow(/Refusing/);
    expect(() => assertSafeOutDir('../../..', FIX)).toThrow(/Refusing/);
    expect(() => assertSafeOutDir(join(FIX, '..'), FIX)).toThrow(/Refusing/);
    expect(() => assertSafeOutDir(FIX, FIX)).toThrow(/Refusing/);
    const foreign = tmp();
    writeFileSync(join(foreign, 'precious.txt'), 'x');
    expect(() => assertSafeOutDir(foreign, FIX)).toThrow(/manifest\.json/);
    expect(existsSync(join(foreign, 'precious.txt'))).toBe(true);
    expect(() => assertSafeOutDir(tmp(), FIX)).not.toThrow();
  });
});

describe('real archive', () => {
  it('builds clean', async () => {
    const out = tmp();
    const r = await build({ dataDir: REAL, outDir: out, ...opts, minNames: 1000 });
    const m: Manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    const entries = Object.values(m.months).flatMap((b) => Object.values(b));
    expect(entries).toHaveLength(59);
    for (const e of entries) for (const f of Object.keys(e.files)) expect(existsSync(join(out, f))).toBe(true);
    const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: out, encoding: 'utf8' }));
    console.log(`real archive: ${r.version} ${r.files} files, packed ${pack[0].size} bytes, unpacked ${pack[0].unpackedSize}`);
    expect(pack[0].size).toBeLessThan(20 * 1024 * 1024);
  }, 180_000);
});
