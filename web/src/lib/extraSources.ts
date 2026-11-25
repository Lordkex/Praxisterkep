// The four files of sources S-V, each fetched by the one section that shows
// it: waiting lists, praxis communities, hospitals in Europe, next door.
import { useEffect, useState } from 'react';
import { dataUrl } from './dataUrl';

export interface WaitNumbers { over60: number; served: number; median: number | null; mean: number | null }
export interface WaitProcedure {
  code: string; name: string; group: 'mandatory' | 'capacity';
  national: WaitNumbers | null;
  institutions: (WaitNumbers & { list: string; region: string; name: string })[];
}
export interface WaitlistRaw { fetched: string; url: string; procedures: WaitProcedure[] }

export interface CommunityCounts {
  total: number; vacant: number; dissolved: number; longTerm: number; rate: number | null;
}
export interface Community {
  id: string; county: string; population: number; members: { name: string; code: string }[];
  gp: CommunityCounts; dental: CommunityCounts;
}
export interface CommunitiesRaw {
  fetched: string; url: string; dataMonth: string; communities: Community[];
  stats: { communities: number; districts: number; single: number };
}

export interface AccessValues { median: number; mean: number; over20: number; over45: number; population: number }
export interface HospitalRaw {
  year: string; version: string; fetched: string; url: string;
  countries: Record<string, AccessValues>;
  regions: Record<string, AccessValues & { name: string }>;
  pairs: [string, string][];
  check: { geo: string; gisco: number; own: number }[];
  ownNational: { median: number; over20: number };
}

export interface NeighbourKind {
  missing: number; short: number; districts: number; borderMissing: number;
  rows: { kraj: string; okres: string; optimal: number; present: number; missing: number; fill: number }[];
}
export interface NeighboursRaw {
  slovakia: {
    asOf: string; fetched: string; url: string; border: string[];
    kinds: { adult: NeighbourKind; child: NeighbourKind };
  };
}

const pending = new Map<string, Promise<unknown>>();

export function useDataFile<T>(name: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    if (!pending.has(name)) {
      pending.set(name, fetch(dataUrl(name)).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    void pending.get(name)?.then((d) => { if (alive) setData(d as T | null); });
    return () => { alive = false; };
  }, [name]);
  return data;
}

/** Highest first, the unmeasured last. */
export function byHighest<T>(rows: T[], value: (row: T) => number | null): T[] {
  return [...rows].sort((a, b) => (value(b) ?? -1) - (value(a) ?? -1));
}
