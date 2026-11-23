#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { countyRanking, longestVacant } from './analyses.ts';
import type { Client } from './client.ts';
import { toCsv } from './csv.ts';
import type { Kind } from './types.ts';

const USAGE = `Usage: hungarian-praxismap <command> [--kind gp|dental]

Commands (CSV on stdout; --kind defaults to gp):
  months                     archived months
  national                   national figures, month by month
  counties <month>           counties ranked by vacancy rate
  longest <month> [--limit N]  longest-vacant districts (default 50)
  history <fin>              one district's status (both branches without --kind)
  diff <from> <to>           districts whose status changed
  verify                     check the manifest's data files against their hashes
  help                       this text
`;

class UsageError extends Error {}

const NATIONAL_COLUMNS = ['month', 'kind', 'totalDistricts', 'vacant', 'dissolved', 'longTerm', 'vacancyRate', 'populationVacant', 'populationDissolved'];
const COUNTY_COLUMNS = ['rank', 'name', 'vacant', 'total', 'vacancyRate'];
const LONGEST_COLUMNS = ['id', 'county', 'settlement', 'type', 'vacantSince', 'months', 'longTerm'];

function parseArgs(argv: string[]) {
  const pos: string[] = [];
  let kind: string | undefined;
  let limit: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kind' || a === '--limit') {
      const v = argv[++i];
      if (v === undefined) throw new UsageError(`${a} needs a value`);
      if (a === '--kind') kind = v; else limit = v;
    } else if (a.startsWith('--')) throw new UsageError(`unknown option ${a}`);
    else pos.push(a);
  }
  if (kind !== undefined && kind !== 'gp' && kind !== 'dental') throw new UsageError(`--kind must be gp or dental, got ${kind}`);
  let n: number | undefined;
  if (limit !== undefined) {
    n = Number(limit);
    if (!Number.isInteger(n) || n < 0) throw new UsageError(`--limit must be a non-negative integer, got ${limit}`);
  }
  return { pos, kind: kind as Kind | undefined, limit: n };
}

function need(pos: string[], n: number, usage: string): void {
  if (pos.length !== n + 1) throw new UsageError(`usage: ${usage}`);
}

export async function run(
  argv: string[],
  client: Client,
  out: (s: string) => void,
  err: (s: string) => void = (s) => process.stderr.write(s),
): Promise<number> {
  try {
    const { pos, kind, limit } = parseArgs(argv);
    const k: Kind = kind ?? 'gp';
    const cmd = pos[0];
    switch (cmd) {
      case undefined:
      case 'help':
        out(USAGE);
        return 0;
      case 'months':
        out(toCsv((await client.months(kind)).map((month) => ({ month })), ['month']));
        return 0;
      case 'national':
        need(pos, 0, 'national');
        out(toCsv(await client.national(k) as unknown as Record<string, unknown>[], NATIONAL_COLUMNS));
        return 0;
      case 'counties':
        need(pos, 1, 'counties <month>');
        out(toCsv(countyRanking(await client.snapshot(pos[1], k)) as unknown as Record<string, unknown>[], COUNTY_COLUMNS));
        return 0;
      case 'longest':
        need(pos, 1, 'longest <month> [--limit N]');
        out(toCsv(longestVacant(await client.snapshot(pos[1], k), limit) as unknown as Record<string, unknown>[], LONGEST_COLUMNS));
        return 0;
      case 'history':
        need(pos, 1, 'history <fin>');
        out(toCsv(await client.praxisHistory(pos[1], kind) as unknown as Record<string, unknown>[], ['month', 'kind', 'status']));
        return 0;
      case 'diff':
        need(pos, 2, 'diff <from> <to>');
        out(toCsv(await client.diff(pos[1], pos[2], k) as unknown as Record<string, unknown>[], ['id', 'from', 'to']));
        return 0;
      case 'verify': {
        need(pos, 0, 'verify');
        const v = await client.verify();
        if (v.ok) { out(`ok ${v.checked}\n`); return 0; }
        err(`mismatched files (${v.mismatched.length} of ${v.checked}):\n`);
        out(v.mismatched.join('\n') + '\n');
        return 1;
      }
      default:
        throw new UsageError(`unknown command ${cmd}`);
    }
  } catch (e) {
    if (e instanceof UsageError) {
      err(`${e.message}\n${USAGE}`);
      return 2;
    }
    err(`${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

function isMain(): boolean {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch { return false; }
}

if (isMain()) {
  // `hungarian-praxismap national | head` closes the pipe early: stop quietly.
  process.stdout.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EPIPE') process.exit(0);
    throw e;
  });
  const { client } = await import('./node.ts');
  process.exitCode = await run(process.argv.slice(2), client, (s) => process.stdout.write(s));
}
