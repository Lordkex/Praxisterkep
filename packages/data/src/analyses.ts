import type { Kind, Snapshot } from './types.ts';

export type Status = 'vacant' | 'vacant_longterm' | 'dissolved' | 'filled' | 'absent' | 'unknown';

export interface NationalRow {
  month: string; kind: Kind; totalDistricts: number | null; vacant: number; dissolved: number;
  longTerm: number | null; vacancyRate: number | null; populationVacant: number; populationDissolved: number;
}
export interface CountyRankRow { rank: number | null; name: string; vacant: number; total: number | null; vacancyRate: number | null }
export interface LongestRow { id: string; county: string; settlement: string; type: string; vacantSince: string; months: number; longTerm: boolean }
export interface HistoryRow { month: string; kind: Kind; status: Status }
export interface DiffRow { id: string; from: Status; to: Status }

const EPS = 1e-9;

export function nationalRow(s: Snapshot): NationalRow {
  const n = s.national;
  return {
    month: s.month, kind: s.kind, totalDistricts: n.totalDistricts ?? null, vacant: n.vacant, dissolved: n.dissolved,
    longTerm: n.longTerm ?? null, vacancyRate: n.vacancyRate ?? null,
    populationVacant: n.populationVacant, populationDissolved: n.populationDissolved,
  };
}

export function countyRanking(s: Snapshot): CountyRankRow[] {
  const rows = s.counties.map((c) => ({ name: c.name, vacant: c.vacant, total: c.total ?? null, vacancyRate: c.vacancyRate ?? null }));
  const rated = rows.filter((r) => r.vacancyRate !== null).sort((a, b) => b.vacancyRate! - a.vacancyRate!);
  const out: CountyRankRow[] = rated.map((r) => ({
    rank: 1 + rated.filter((o) => o.vacancyRate! > r.vacancyRate! + EPS).length, ...r,
  }));
  for (const r of rows) if (r.vacancyRate === null) out.push({ rank: null, ...r });
  return out;
}

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + m;
}

export function longestVacant(s: Snapshot, limit = 50): LongestRow[] {
  return s.praxes
    .filter((p) => p.status === 'vacant' || p.status === 'vacant_longterm')
    .sort((a, b) => a.vacantSince.localeCompare(b.vacantSince) || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((p) => ({
      id: p.id, county: p.county, settlement: p.sites[0]?.settlement ?? '', type: p.type,
      vacantSince: p.vacantSince, months: monthIndex(s.month) - monthIndex(p.vacantSince),
      longTerm: p.status === 'vacant_longterm' || p.longTerm === true,
    }));
}

export function statusIn(s: Snapshot, fin: string): Status {
  const p = s.praxes.find((x) => x.id === fin);
  if (p) return p.status;
  if (s.filledPraxes.some((x) => x.id === fin)) return 'filled';
  return s.filledPraxes.length === 0 ? 'unknown' : 'absent';
}

export function diffRows(a: Snapshot, b: Snapshot): DiffRow[] {
  const ids = new Set<string>();
  for (const s of [a, b]) {
    for (const p of s.praxes) ids.add(p.id);
    for (const p of s.filledPraxes) ids.add(p.id);
  }
  const out: DiffRow[] = [];
  for (const id of [...ids].sort()) {
    const from = statusIn(a, id), to = statusIn(b, id);
    if (from !== to) out.push({ id, from, to });
  }
  return out;
}
