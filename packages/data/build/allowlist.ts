// The field allowlist: the single source of truth for what a published
// snapshot may contain. strip() copies only what the tree names and throws on
// anything else, so a new upstream field (or a name) cannot slip into the
// package unseen. The JSON Schema is generated from the same tree.
//
// Tree conventions:
//   - a leaf is a type name; a trailing "?" means null or absent is allowed;
//   - a subtree is an object, an array of one subtree/leaf is a list;
//   - a KEY ending in "?" marks an optional subtree or list (absent is fine,
//     null is not), e.g. "servedSettlements?" or "school?".
import type { CoordinateRow, Snapshot } from '../src/types.ts';

export type Leaf = 'string' | 'number' | 'integer' | 'boolean' | 'boolean?' | 'string?' | 'number?' | 'integer?';
export type FieldTree = { [key: string]: Leaf | FieldTree | [FieldTree] | [Leaf] };

const byTypeEntry: FieldTree = { total: 'integer?', vacant: 'integer' };

const counts: FieldTree = {
  vacant: 'integer',
  dissolved: 'integer',
  longTerm: 'integer?',
  vacancyRate: 'number?',
  praxesPer10k: 'number?',
  populationTotal: 'integer',
  populationVacant: 'integer',
  populationDissolved: 'integer',
  populationShare: 'number',
  byType: {
    // A type with no districts in that area is simply absent in the archive.
    'adult?': byTypeEntry,
    'child?': byTypeEntry,
    'mixed?': byTypeEntry,
    'school?': byTypeEntry,
  },
};

export const ALLOWLIST: FieldTree = {
  schemaVersion: 'integer',
  kind: 'string',
  month: 'string',
  disclaimer: 'string',
  longTermAsOf: 'string?',
  sources: ['string'],
  national: { totalDistricts: 'integer?', ...counts },
  counties: [{ name: 'string', total: 'integer?', ...counts }],
  praxes: [
    {
      id: 'string',
      kind: 'string',
      type: 'string',
      status: 'string',
      county: 'string',
      countyCode: 'string',
      vacantSince: 'string',
      longTerm: 'boolean?',
      longTermSince: 'string?',
      population: 'integer',
      'servedSettlements?': ['string'],
      sites: [
        {
          address: 'string',
          addressRaw: 'string?',
          district: 'string',
          settlement: 'string',
          postalCode: 'string',
          isHeadquarters: 'boolean',
          geoApprox: 'boolean?', // absent on a site that has no coordinates
        },
      ],
    },
  ],
  filledPraxes: [
    {
      id: 'string',
      type: 'string',
      county: 'string',
      district: 'string?',
      settlement: 'string',
      postalCode: 'string',
      address: 'string',
      addressRaw: 'string?',
      level: 'string?',
      neakCode: 'string?',
      'servedSettlements?': ['string'],
    },
  ],
  settlements: [
    {
      kshId: 'string',
      name: 'string',
      county: 'string',
      population: 'integer',
      filled: 'integer',
      vacantPraxisIds: ['string'],
      'dissolvedPraxisIds?': ['string'],
      affectedByDissolved: 'boolean',
    },
  ],
};

/** Read and dropped: never reach any output. */
export const DROPPED = ['filledPraxes[].doctor', 'filledPraxes[].provider'];
/** Read and moved to the coordinates table: never in the snapshot JSON. */
export const MOVED = ['praxes[].sites[].lat', 'praxes[].sites[].lon'];

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function leafOk(leaf: string, v: unknown): boolean {
  const optional = leaf.endsWith('?');
  const base = optional ? leaf.slice(0, -1) : leaf;
  if (v === null || v === undefined) return optional;
  if (base === 'integer') return Number.isInteger(v);
  if (base === 'number') return typeof v === 'number' && Number.isFinite(v);
  return typeof v === base;
}

const isLeaf = (n: unknown): n is Leaf => typeof n === 'string';

function walk(node: Leaf | FieldTree | [FieldTree] | [Leaf], value: unknown, path: string, where: string): Json {
  const fail = (why: string): never => {
    throw new Error(`${where}: ${path || '(root)'} ${why}`);
  };
  if (isLeaf(node)) {
    if (!leafOk(node, value)) fail(`expected ${node}, got ${JSON.stringify(value)}`);
    return value as Json;
  }
  if (Array.isArray(node)) {
    if (!Array.isArray(value)) return fail('expected an array');
    return (value as unknown[]).map((item) => walk(node[0], item, `${path}[]`, where));
  }
  if (!isObject(value)) return fail('expected an object');
  const known = new Map<string, { key: string; optional: boolean; node: Leaf | FieldTree | [FieldTree] | [Leaf] }>();
  for (const [k, n] of Object.entries(node)) {
    const optional = k.endsWith('?');
    const name = optional ? k.slice(0, -1) : k;
    known.set(name, { key: name, optional, node: n });
  }
  const out: { [k: string]: Json } = {};
  for (const [k, v] of Object.entries(value)) {
    const sub = path ? `${path}.${k}` : k;
    // Array elements are addressed as "praxes[].sites[]", so a child of an
    // array item keeps the "[]" already in `path` and just appends ".key".
    if (DROPPED.includes(sub)) continue;
    if (MOVED.includes(sub)) {
      if (!leafOk('number?', v)) throw new Error(`${where}: ${sub} expected number, got ${JSON.stringify(v)}`);
      continue;
    }
    const entry = known.get(k);
    if (!entry) throw new Error(`${where}: ${sub} is not in the allowlist`);
    if (v === undefined) continue;
    if (entry.optional && !isLeaf(entry.node) && v === null) {
      throw new Error(`${where}: ${sub} expected a value or absence, got null`);
    }
    out[k] = walk(entry.node, v, sub, where);
  }
  for (const [name, entry] of known) {
    if (entry.optional || (isLeaf(entry.node) && entry.node.endsWith('?'))) continue;
    if (!(name in value) || value[name] === undefined) {
      throw new Error(`${where}: ${path ? `${path}.${name}` : name} is missing`);
    }
  }
  return out;
}

function coordinatesOf(snapshot: Record<string, unknown>, where: string): CoordinateRow[] {
  const rows: CoordinateRow[] = [];
  for (const p of snapshot.praxes as Record<string, unknown>[]) {
    (p.sites as Record<string, unknown>[]).forEach((s, siteIndex) => {
      const { lat, lon } = s;
      const none = (v: unknown) => v === null || v === undefined;
      if (none(lat) && none(lon)) return;
      if (none(lat) || none(lon)) {
        throw new Error(`${where}: praxes[].sites[] ${String(p.id)}#${siteIndex} has only one of lat/lon`);
      }
      rows.push({
        id: p.id as string,
        siteIndex,
        lat: lat as number,
        lon: lon as number,
        geoApprox: s.geoApprox === true,
      });
    });
  }
  return rows;
}

/** Copy `snapshot` through the allowlist. Throws, naming `where` and the path, on any surprise. */
export function strip(snapshot: unknown, where: string): { json: Snapshot; coordinates: CoordinateRow[] } {
  if (!isObject(snapshot)) throw new Error(`${where}: snapshot is not an object`);
  const json = walk(ALLOWLIST, snapshot, '', where) as unknown as Snapshot;
  return { json, coordinates: coordinatesOf(snapshot, where) };
}

function leafSchema(leaf: Leaf): object {
  const optional = leaf.endsWith('?');
  const base = optional ? leaf.slice(0, -1) : leaf;
  return { type: optional ? [base, 'null'] : base };
}

function nodeSchema(node: Leaf | FieldTree | [FieldTree] | [Leaf]): object {
  if (isLeaf(node)) return leafSchema(node);
  if (Array.isArray(node)) return { type: 'array', items: nodeSchema(node[0]) };
  const properties: Record<string, object> = {};
  const required: string[] = [];
  for (const [k, n] of Object.entries(node)) {
    const optional = k.endsWith('?');
    const name = optional ? k.slice(0, -1) : k;
    properties[name] = nodeSchema(n);
    if (!optional && !(isLeaf(n) && n.endsWith('?'))) required.push(name);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

/** JSON Schema (2020-12) generated from the allowlist. */
export function schemaFrom(tree: FieldTree): object {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'hungarian-praxismap snapshot',
    ...nodeSchema(tree),
  };
}
