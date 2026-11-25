// Manifest helpers: which raw source files stand behind a month and branch
// (name, hash, size, pinned URL; never copied into the package, the registry
// XLS carries names) and the hand-written JSON Schema of manifest.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Kind, RawEntry, RawRole } from '../src/types.ts';

export const REPO_BLOB = 'https://github.com/ZoliQua/Praxisterkep/blob';

function roleOf(name: string, kind: Kind): RawRole {
  const stem = name.replace(/\.[^.]+$/, '');
  if (stem === `${kind}_registry`) return 'registry';
  if (stem === `${kind}_vacant`) return 'vacant';
  if (stem === `${kind}_vacant_dissolved`) return 'dissolved';
  if (name === `okfo_${kind}.html`) return 'okfo';
  return 'other';
}

/** Raw files of one month and branch, sorted by name; null when the archive holds none. */
export function rawFiles(dataDir: string, month: string, kind: Kind, commit: string): RawEntry[] | null {
  const dir = join(dataDir, 'raw', month);
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (e.name.startsWith(`${kind}_`) || e.name === `okfo_${kind}.html`))
    .map((e) => e.name)
    .sort();
  if (names.length === 0) return null;
  return names.map((name) => {
    const buf = readFileSync(join(dir, name));
    return {
      name,
      role: roleOf(name, kind),
      sha256: createHash('sha256').update(buf).digest('hex'),
      bytes: buf.length,
      url: `${REPO_BLOB}/${commit}/data/raw/${month}/${name}`,
    };
  });
}

/** The roles every month and branch is expected to have a raw file for. */
export function missingRaw(raw: RawEntry[] | null): ('registry' | 'vacant')[] {
  const have = new Set((raw ?? []).map((r) => r.role));
  return (['registry', 'vacant'] as const).filter((r) => !have.has(r));
}

const file = { type: 'object', properties: { sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' }, bytes: { type: 'integer' } }, required: ['sha256', 'bytes'], additionalProperties: false };
const rawEntry = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    role: { enum: ['registry', 'vacant', 'dissolved', 'okfo', 'other'] },
    sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
    bytes: { type: 'integer' },
    url: { type: 'string' },
  },
  required: ['name', 'role', 'sha256', 'bytes', 'url'],
  additionalProperties: false,
};
const entry = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'integer' },
    sources: { type: 'array', items: { type: 'string' } },
    longTermAsOf: { type: ['string', 'null'] },
    files: { type: 'object', additionalProperties: file },
    raw: { oneOf: [{ type: 'null' }, { type: 'array', items: rawEntry }] },
    missingRaw: { type: 'array', items: { enum: ['registry', 'vacant'] } },
  },
  required: ['schemaVersion', 'sources', 'longTermAsOf', 'files', 'raw', 'missingRaw'],
  additionalProperties: false,
};

export const MANIFEST_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'hungarian-praxismap manifest',
  type: 'object',
  properties: {
    package: { const: 'hungarian-praxismap' },
    version: { type: 'string', pattern: '^\\d{4}\\.[1-9]\\d?\\.\\d+$' },
    built: { type: 'string' },
    commit: { type: 'string' },
    conceptDoi: { const: '10.5281/zenodo.23460426' },
    tag: { type: 'string', pattern: '^data-' },
    licences: {
      type: 'object',
      properties: { code: { const: 'MIT' }, data: { const: 'CC-BY-4.0' }, coordinates: { const: 'ODbL-1.0' } },
      required: ['code', 'data', 'coordinates'],
      additionalProperties: false,
    },
    disclaimer: { type: 'string' },
    months: {
      type: 'object',
      patternProperties: {
        '^\\d{4}-\\d{2}$': {
          type: 'object',
          properties: { gp: entry, dental: entry },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  required: ['package', 'version', 'built', 'commit', 'conceptDoi', 'tag', 'licences', 'disclaimer', 'months'],
  additionalProperties: false,
};
