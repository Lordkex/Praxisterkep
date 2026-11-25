// Turns the repo's data/ archive into a publishable package root.
//   node build/build.ts [--patch N] [--data DIR] [--out DIR] [--local]
// build() is pure file work; the "data/ must be clean" and "HEAD is on
// origin/main" refusals and the git calls live only in the CLI entry below.
// --local skips the origin/main check for a development build and marks its
// package.json private, so npm publish refuses it.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ALLOWLIST, schemaFrom, strip } from './allowlist.ts';
import { checkNoCoordinates, collectNames, guardOutput } from './guard.ts';
import { MANIFEST_SCHEMA, missingRaw, rawFiles } from './manifest.ts';
import { versionFor } from './version.ts';
import { parseCsv, toCsv } from '../src/csv.ts';
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
  /** A development build: package.json gets "private": true, so npm publish refuses it. */
  local?: boolean;
}

/** The published package.json: the template with the version filled, private when local. */
export function packageJson(template: Record<string, unknown>, version: string, local: boolean): Record<string, unknown> {
  const pkg: Record<string, unknown> = { ...template, version };
  if (local) pkg.private = true;
  return pkg;
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

/** Parse every output file, naming the file when one cannot be read. */
export function assertParseable(files: { path: string; text: string }[]): void {
  for (const c of files) {
    try {
      if (c.path.endsWith('.json')) JSON.parse(c.text);
      else parseCsv(c.text);
    } catch (e) {
      throw new Error(`${c.path}: ${(e as Error).message}`);
    }
  }
}

/** Resolve outDir and refuse anything build() must never empty. */
export function assertSafeOutDir(outDir: string, dataDir: string): string {
  const out = resolve(outDir);
  const inside = (parent: string, child: string): boolean => child === parent || child.startsWith(parent + sep);
  const protectedDirs = [PKG, join(PKG, '../..'), resolve(dataDir), process.cwd()];
  for (const d of protectedDirs)
    if (inside(out, d)) throw new Error(`Refusing to build into ${out}: it is or contains ${d}`);
  if (existsSync(out) && readdirSync(out).length > 0 && !existsSync(join(out, 'manifest.json')))
    throw new Error(`Refusing to empty ${out}: it is not empty and holds no manifest.json from an earlier build`);
  return out;
}

const MONTHS_BLOCK = /<!-- months -->[\s\S]*?<!-- \/months -->/;

/** Fill the README's months block from the manifest: newest month first, ✓ / – per branch. */
export function fillMonths(readme: string, manifest: Pick<Manifest, 'months'>): string {
  if (!MONTHS_BLOCK.test(readme)) throw new Error('README.md has no <!-- months --> … <!-- /months --> block');
  const mark = (on: unknown): string => (on ? '✓' : '–');
  const rows = Object.keys(manifest.months).sort().reverse()
    .map((m) => `| ${m} | ${mark(manifest.months[m].gp)} | ${mark(manifest.months[m].dental)} |`);
  const table = ['| Hónap / Month | Háziorvos / GP | Fogorvos / Dental |', '|---|:-:|:-:|', ...rows].join('\n');
  return readme.replace(MONTHS_BLOCK, () => `<!-- months -->\n${table}\n<!-- /months -->`);
}

/** The dist README: the version token replaced everywhere, the months block filled. */
export function fillReadme(readme: string, manifest: Pick<Manifest, 'months' | 'version'>): string {
  return fillMonths(readme.replaceAll('{{VERSION}}', manifest.version), manifest);
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
      if (!existsSync(p)) continue;
      const where = `${month}/${kind}.json`;
      let raw: any;
      try { raw = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${where}: ${(e as Error).message}`); }
      sources.push({ month, kind, raw, where });
    }
  if (sources.length === 0) throw new Error(`No snapshots found in ${o.dataDir}`);

  const version = versionFor(months.filter((m) => sources.some((s) => s.month === m)).at(-1)!, o.patch);
  const names = collectNames(sources.map((s) => ({ where: s.where, data: s.raw })));
  if (o.minNames !== undefined && names.size < o.minNames)
    throw new Error(`Name guard: only ${names.size} names collected, expected at least ${o.minNames}; the source was misread`);

  const outDir = assertSafeOutDir(o.outDir, o.dataDir);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  try {
    return await assemble({ ...o, outDir }, sources, version, names);
  } catch (e) {
    rmSync(outDir, { recursive: true, force: true });
    throw e;
  }
}

async function assemble(
  o: BuildOptions,
  sources: { month: string; kind: Kind; raw: any; where: string }[],
  version: string,
  names: Map<string, string>,
): Promise<{ version: string; files: number }> {

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
  // .md files are not passed to the guard; the fill adds only the version, months and marks.
  write(o.outDir, 'README.md', fillReadme(readFileSync(join(PKG, 'README.md'), 'utf8'), manifest));
  compileLib(o.outDir, version);

  const checked = walkFiles(o.outDir)
    .filter((p) => /\.(json|csv)$/.test(p) && !relative(o.outDir, p).startsWith('lib/'))
    .sort()
    .map((p) => ({ path: relative(o.outDir, p), text: readFileSync(p, 'utf8') }));
  assertParseable(checked);
  checkNoCoordinates(checked);
  guardOutput(names, checked);

  const template = JSON.parse(readFileSync(join(PKG, 'package.template.json'), 'utf8'));
  write(o.outDir, 'package.json', pretty(packageJson(template, version, o.local ?? false)));
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
  const local = process.argv.includes('--local');
  // dist/ is git-ignored, so a finished build does not count as a change here.
  const dirty = git('status', '--porcelain', '--', 'data', 'packages/data');
  if (dirty) {
    console.error(`data/ or packages/data/ has uncommitted changes; the manifest would name a commit that does not hold these files:\n${dirty}`);
    process.exit(1);
  }
  if (local) {
    console.warn('--local: origin/main is not checked; dist/package.json is marked "private": true, so npm publish refuses this build.');
  } else {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], { cwd: repo, stdio: 'pipe' });
    } catch {
      console.error('HEAD is not on origin/main, so the commit the manifest names may not exist on GitHub. '
        + 'Fetch (git fetch origin), merge your work into main and push it first, or build with --local for a development build that cannot be published.');
      process.exit(1);
    }
  }
  try {
    const r = await build({
      dataDir,
      outDir: arg('--out', join(PKG, 'dist')),
      patch: Number(arg('--patch', '0')),
      commit: git('rev-parse', 'HEAD'),
      committedAt: git('log', '-1', '--format=%cI'),
      minNames: 1000,
      local,
    });
    console.log(`hungarian-praxismap ${r.version}: ${r.files} files`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
