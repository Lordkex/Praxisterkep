// Turns the repo's data/ archive into a publishable package root.
//   node build/build.ts [--patch N] [--data DIR] [--out DIR]
// build() is pure file work; the "data/ must be clean" refusal and the git
// calls live only in the CLI entry below.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALLOWLIST, schemaFrom, strip } from './allowlist.ts';
import { collectNames, guardOutput } from './guard.ts';
import { MANIFEST_SCHEMA, missingRaw, rawFiles } from './manifest.ts';
import { versionFor } from './version.ts';
import { toCsv } from '../src/csv.ts';
import { COORDINATE_COLUMNS, TABLES } from '../src/tables.ts';
import type { Kind, Manifest, ManifestEntry, Snapshot } from '../src/types.ts';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const KINDS: Kind[] = ['dental', 'gp'];
const DOC_FILES = ['README.md', 'LICENSE.md', 'CHANGELOG.md'];

export interface BuildOptions {
  dataDir: string;
  outDir: string;
  patch: number;
  commit: string;
  committedAt: string;
  /** Refuse when fewer names were collected (a guard over too few names means a misread source). */
  minNames?: number;
}

const compact = (v: unknown): string => JSON.stringify(v) + '\n';
const pretty = (v: unknown): string => JSON.stringify(v, null, 2) + '\n';

function write(outDir: string, rel: string, text: string): { sha256: string; bytes: number } {
  const path = join(outDir, rel);
  mkdirSync(dirname(path), { recursive: true });
  const buf = Buffer.from(text, 'utf8');
  writeFileSync(path, buf);
  return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

function walkFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkFiles(join(dir, e.name)) : [join(dir, e.name)]);
}

function compileLib(outDir: string, version: string): void {
  const tmp = mkdtempSync(join(tmpdir(), 'praxis-lib-'));
  try {
    cpSync(join(PKG, 'src'), join(tmp, 'src'), { recursive: true });
    writeFileSync(join(tmp, 'src/version.ts'), `export const VERSION = '${version}';\n`);
    // A tsconfig inside the temp dir, so "include" and the module format (the
    // nearest package.json: type module) both refer to the temp copy.
    writeFileSync(join(tmp, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(tmp, 'tsconfig.json'), JSON.stringify({
      extends: join(PKG, 'tsconfig.lib.json'),
      compilerOptions: { rootDir: 'src', outDir: join(outDir, 'lib'), typeRoots: [join(PKG, 'node_modules/@types')] },
      include: ['src'],
    }));
    execFileSync(process.execPath, [join(PKG, 'node_modules/typescript/bin/tsc'), '-p', join(tmp, 'tsconfig.json')], {
      cwd: tmp,
      stdio: 'pipe',
    });
  } catch (e: any) {
    throw new Error(`tsc failed:\n${e.stdout ?? ''}${e.stderr ?? ''}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function build(o: BuildOptions): Promise<{ version: string; files: number }> {
  for (const f of DOC_FILES) if (!existsSync(join(PKG, f))) throw new Error(`${f} is missing from packages/data`);

  const months = readdirSync(o.dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort();
  const sources: { month: string; kind: Kind; raw: any; where: string }[] = [];
  for (const month of months)
    for (const kind of KINDS) {
      const p = join(o.dataDir, month, `${kind}.json`);
      if (existsSync(p)) sources.push({ month, kind, raw: JSON.parse(readFileSync(p, 'utf8')), where: `${month}/${kind}.json` });
    }
  if (sources.length === 0) throw new Error(`No snapshots found in ${o.dataDir}`);

  const version = versionFor(months.filter((m) => sources.some((s) => s.month === m)).at(-1)!, o.patch);
  const names = collectNames(sources.map((s) => ({ where: s.where, data: s.raw })));
  if (o.minNames !== undefined && names.size < o.minNames)
    throw new Error(`Name guard: only ${names.size} names collected, expected at least ${o.minNames}; the source was misread`);

  rmSync(o.outDir, { recursive: true, force: true });
  mkdirSync(o.outDir, { recursive: true });

  const manifest: Manifest = {
    package: 'hungarian-praxismap',
    version,
    built: o.committedAt,
    commit: o.commit,
    conceptDoi: '10.5281/zenodo.23460426',
    tag: `data-${version}`,
    licences: { code: 'MIT', data: 'CC-BY-4.0', coordinates: 'ODbL-1.0' },
    disclaimer: '',
    months: {},
  };

  for (const s of sources) {
    const { json, coordinates } = strip(s.raw, s.where);
    if (!manifest.disclaimer) manifest.disclaimer = json.disclaimer;
    else if (manifest.disclaimer !== json.disclaimer)
      throw new Error(`${s.where}: disclaimer differs from the others`);
    const base = `months/${s.month}/${s.kind}`;
    const files: ManifestEntry['files'] = {};
    files[`${base}.json`] = write(o.outDir, `${base}.json`, compact(json));
    for (const [name, table] of Object.entries(TABLES))
      files[`${base}-${name}.csv`] = write(o.outDir, `${base}-${name}.csv`, toCsv(table.rows(json as Snapshot), table.columns));
    files[`${base}-coordinates.csv`] = write(o.outDir, `${base}-coordinates.csv`, toCsv(coordinates as any, COORDINATE_COLUMNS));
    const raw = rawFiles(o.dataDir, s.month, s.kind, o.commit);
    (manifest.months[s.month] ??= {})[s.kind] = {
      schemaVersion: json.schemaVersion,
      sources: json.sources,
      longTermAsOf: json.longTermAsOf ?? null,
      files,
      raw,
      missingRaw: missingRaw(raw),
    };
  }

  write(o.outDir, 'manifest.json', pretty(manifest));
  write(o.outDir, 'schema/snapshot.schema.json', pretty(schemaFrom(ALLOWLIST)));
  write(o.outDir, 'schema/manifest.schema.json', pretty(MANIFEST_SCHEMA));
  for (const f of DOC_FILES) cpSync(join(PKG, f), join(o.outDir, f));
  compileLib(o.outDir, version);

  const checked = walkFiles(o.outDir)
    .filter((p) => /\.(json|csv)$/.test(p) && !relative(o.outDir, p).startsWith('lib/'))
    .sort()
    .map((p) => ({ path: relative(o.outDir, p), text: readFileSync(p, 'utf8') }));
  try {
    guardOutput(names, checked);
  } catch (e) {
    // A CSV parse error does not name its file; do.
    const msg = (e as Error).message;
    throw checked.some((c) => msg.includes(c.path)) || msg.startsWith('Name guard') ? e : new Error(`Name guard could not read the output: ${msg}`);
  }

  const template = JSON.parse(readFileSync(join(PKG, 'package.template.json'), 'utf8'));
  template.version = version;
  write(o.outDir, 'package.json', pretty(template));
  return { version, files: walkFiles(o.outDir).length };
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repo = join(PKG, '../..');
  const dataDir = arg('--data', join(repo, 'data'));
  const git = (...a: string[]): string => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();
  const dirty = git('status', '--porcelain', 'data');
  if (dirty) {
    console.error(`data/ has uncommitted changes; the manifest would name a commit that does not hold these files:\n${dirty}`);
    process.exit(1);
  }
  try {
    const r = await build({
      dataDir,
      outDir: arg('--out', join(PKG, 'dist')),
      patch: Number(arg('--patch', '0')),
      commit: git('rev-parse', 'HEAD'),
      committedAt: git('log', '-1', '--format=%cI'),
      minNames: 1000,
    });
    console.log(`hungarian-praxismap ${r.version}: ${r.files} files`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
