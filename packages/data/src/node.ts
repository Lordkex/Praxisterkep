import { readFile } from 'node:fs/promises';
import { createClient } from './client.ts';

export const client = createClient((path) => readFile(new URL('../' + path, import.meta.url), 'utf8'));

export { createClient };
export type { Client } from './client.ts';
export * from './analyses.ts';
export type * from './types.ts';
