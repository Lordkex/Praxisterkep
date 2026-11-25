import { createClient } from './client.ts';
import { VERSION } from './version.ts';

const BASE = `https://cdn.jsdelivr.net/npm/hungarian-praxismap@${VERSION}/`;

export const client = createClient(async (path) => {
  const url = BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.text();
});

export { createClient };
export type { Client } from './client.ts';
export * from './analyses.ts';
export type * from './types.ts';
