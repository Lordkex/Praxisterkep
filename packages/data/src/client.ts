import { diffRows, nationalRow, statusIn } from './analyses.ts';
import type { DiffRow, HistoryRow, NationalRow } from './analyses.ts';
import { parseCsv } from './csv.ts';
import type { CoordinateRow, Kind, Manifest, Snapshot } from './types.ts';

export interface Client {
  manifest(): Promise<Manifest>;
  months(kind?: Kind): Promise<string[]>;
  snapshot(month: string, kind: Kind): Promise<Snapshot>;
  national(kind: Kind): Promise<NationalRow[]>;
  praxisHistory(fin: string, kind?: Kind): Promise<HistoryRow[]>;
  diff(from: string, to: string, kind: Kind): Promise<DiffRow[]>;
  coordinates(month: string, kind: Kind): Promise<CoordinateRow[]>;
  verify(): Promise<{ ok: boolean; checked: number; mismatched: string[] }>;
}

const KINDS: Kind[] = ['gp', 'dental'];

async function sha256(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createClient(load: (path: string) => Promise<string>): Client {
  let manifestP: Promise<Manifest> | undefined;
  const snaps = new Map<string, Promise<Snapshot>>();

  const manifest = () => {
    if (!manifestP) {
      const p = load('manifest.json').then((t) => JSON.parse(t) as Manifest);
      p.catch(() => { if (manifestP === p) manifestP = undefined; });
      manifestP = p;
    }
    return manifestP;
  };

  const months = async (kind?: Kind) => {
    const m = await manifest();
    return Object.keys(m.months)
      .filter((k) => (kind ? m.months[k][kind] : KINDS.some((x) => m.months[k][x])))
      .sort();
  };

  const snapshot = async (month: string, kind: Kind) => {
    const have = await months(kind);
    if (!have.includes(month))
      throw new Error(`No ${kind} data archived for ${month}. Available months for ${kind}: ${have.length ? have.join(', ') : 'none'}`);
    const path = `months/${month}/${kind}.json`;
    let p = snaps.get(path);
    if (!p) {
      p = load(path).then((t) => JSON.parse(t) as Snapshot);
      p.catch(() => snaps.delete(path));
      snaps.set(path, p);
    }
    return p;
  };

  return {
    manifest,
    months,
    snapshot,
    async national(kind) {
      const out: NationalRow[] = [];
      for (const m of await months(kind)) out.push(nationalRow(await snapshot(m, kind)));
      return out;
    },
    async praxisHistory(fin, kind) {
      const out: HistoryRow[] = [];
      for (const k of kind ? [kind] : KINDS)
        for (const m of await months(k)) out.push({ month: m, kind: k, status: statusIn(await snapshot(m, k), fin) });
      return out.sort((a, b) => a.month.localeCompare(b.month) || a.kind.localeCompare(b.kind));
    },
    async diff(from, to, kind) {
      return diffRows(await snapshot(from, kind), await snapshot(to, kind));
    },
    async coordinates(month, kind) {
      await snapshot(month, kind); // validates the month and branch
      const [, ...rows] = parseCsv(await load(`months/${month}/${kind}-coordinates.csv`));
      return rows.map(([id, siteIndex, lat, lon, geoApprox]) => ({
        id, siteIndex: Number(siteIndex), lat: Number(lat), lon: Number(lon), geoApprox: geoApprox === 'true',
      }));
    },
    async verify() {
      const m = await manifest();
      const mismatched: string[] = [];
      let checked = 0;
      for (const byKind of Object.values(m.months))
        for (const entry of Object.values(byKind))
          for (const [path, f] of Object.entries(entry.files)) {
            checked++;
            if ((await sha256(await load(path))) !== f.sha256) mismatched.push(path);
          }
      return { ok: mismatched.length === 0, checked, mismatched };
    },
  };
}
