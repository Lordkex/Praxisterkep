// Second layer of the name guard. strip() (allowlist.ts) is the first layer;
// this one checks the finished output against every physician and provider
// name in the whole archive, because an npm version cannot be withdrawn.
//
// Hit format, one per line in the thrown message:
//   <file path> <location> "<name>"
// (source: <where>) where <location> is a JSON pointer (/filledPraxes/0/address)
// for .json files and <record>:<column header> for .csv files (1-based record
// numbers, the header being record 1, e.g. 3:address; a record with embedded
// newlines spans several physical lines). Matching is exact, case-sensitive and
// whole-value, after collapsing whitespace.
import { parseCsv } from '../src/csv.ts';

const norm = (s: string): string => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const FORBIDDEN_KEYS = new Set(['doctor', 'provider']);

export function collectNames(snapshots: Iterable<{ where: string; data: any }>): Map<string, string> {
  const names = new Map<string, string>();
  for (const { where, data } of snapshots) {
    const list = data?.filledPraxes;
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      for (const k of ['doctor', 'provider']) {
        const v = p?.[k];
        if (typeof v !== 'string') continue;
        const n = norm(v);
        if (n && !names.has(n)) names.set(n, where);
      }
    }
  }
  return names;
}

const escapePointer = (k: string): string => k.replace(/~/g, '~0').replace(/\//g, '~1');

function walk(names: ReadonlyMap<string, string>, path: string, node: unknown, pointer: string, hits: string[]): void {
  if (typeof node === 'string') {
    const n = norm(node);
    if (names.has(n)) hits.push(`${path} ${pointer || '/'} "${n}" (source: ${names.get(n)})`);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walk(names, path, v, `${pointer}/${i}`, hits));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const at = `${pointer}/${escapePointer(k)}`;
      if (FORBIDDEN_KEYS.has(k)) hits.push(`${path} ${at} forbidden key "${k}"`);
      const nk = norm(k);
      if (names.has(nk)) hits.push(`${path} ${at} "${nk}" (source: ${names.get(nk)})`);
      walk(names, path, v, at, hits);
    }
  }
}

export function guardOutput(names: ReadonlyMap<string, string>, files: { path: string; text: string }[]): void {
  if (names.size === 0) throw new Error('Name guard: the name set is empty, so nothing could be checked');
  const hits: string[] = [];
  for (const { path, text } of files) {
    const ext = path.toLowerCase().match(/\.[^./\\]*$/)?.[0];
    if (ext === '.json') {
      walk(names, path, JSON.parse(text), '', hits);
    } else if (ext === '.csv') {
      const rows = parseCsv(text);
      const header = rows[0] ?? [];
      header.forEach((h, c) => {
        if (FORBIDDEN_KEYS.has(norm(h).toLowerCase())) hits.push(`${path} 1:${c + 1} forbidden column "${h}"`);
      });
      rows.forEach((row, r) => {
        if (row.length !== header.length) {
          hits.push(`${path} ${r + 1} column count ${row.length}, header has ${header.length}`);
        }
        row.forEach((cell, c) => {
          for (const part of new Set([cell, ...cell.split('; ')].map(norm))) {
            if (names.has(part)) hits.push(`${path} ${r + 1}:${header[c] ?? c + 1} "${part}" (source: ${names.get(part)})`);
          }
        });
      });
    } else {
      hits.push(`${path} unsupported file type (only .json and .csv may be published)`);
    }
  }
  if (hits.length) {
    throw new Error(`Name guard: ${hits.length} hit(s), refusing to publish\n${hits.join('\n')}`);
  }
}
