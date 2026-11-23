// Second layer of the name guard. strip() (allowlist.ts) is the first layer;
// this one checks the finished output against every physician and provider
// name in the whole archive, because an npm version cannot be withdrawn.
//
// Hit format, one per line in the thrown message:
//   <file path> <location> "<name>"
// where <location> is a JSON pointer (/filledPraxes/0/address) for .json
// files and <line>:<column header> for .csv files (1-based line numbers, the
// header being line 1, e.g. 3:address). Matching is exact, case-sensitive and
// whole-value, after collapsing whitespace.
import { parseCsv } from '../src/csv.ts';

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const FORBIDDEN_KEYS = new Set(['doctor', 'provider']);

export function collectNames(snapshots: Iterable<{ where: string; data: any }>): Set<string> {
  const names = new Set<string>();
  for (const { data } of snapshots) {
    const list = data?.filledPraxes;
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      for (const k of ['doctor', 'provider']) {
        const v = p?.[k];
        if (typeof v !== 'string') continue;
        const n = norm(v);
        if (n) names.add(n);
      }
    }
  }
  return names;
}

const escapePointer = (k: string): string => k.replace(/~/g, '~0').replace(/\//g, '~1');

function walk(names: Set<string>, path: string, node: unknown, pointer: string, hits: string[]): void {
  if (typeof node === 'string') {
    const n = norm(node);
    if (names.has(n)) hits.push(`${path} ${pointer || '/'} "${n}"`);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => walk(names, path, v, `${pointer}/${i}`, hits));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const at = `${pointer}/${escapePointer(k)}`;
      if (FORBIDDEN_KEYS.has(k)) hits.push(`${path} ${at} forbidden key "${k}"`);
      const nk = norm(k);
      if (names.has(nk)) hits.push(`${path} ${at} "${nk}"`);
      walk(names, path, v, at, hits);
    }
  }
}

export function guardOutput(names: Set<string>, files: { path: string; text: string }[]): void {
  const hits: string[] = [];
  for (const { path, text } of files) {
    if (path.endsWith('.json')) {
      walk(names, path, JSON.parse(text), '', hits);
    } else if (path.endsWith('.csv')) {
      const rows = parseCsv(text);
      const header = rows[0] ?? [];
      rows.forEach((row, r) => {
        row.forEach((cell, c) => {
          const parts = [cell, ...cell.split('; ')];
          for (const part of new Set(parts.map(norm))) {
            if (names.has(part)) hits.push(`${path} ${r + 1}:${header[c] ?? c + 1} "${part}"`);
          }
        });
      });
    }
  }
  if (hits.length) {
    throw new Error(`Name guard: ${hits.length} hit(s), refusing to publish\n${hits.join('\n')}`);
  }
}
