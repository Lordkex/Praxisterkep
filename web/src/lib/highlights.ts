// highlights.json, read once per page: the landing shows it twice (the
// animated results story under the search, the finding cards further down).
import { useEffect, useState } from 'react';
import { dataUrl } from './dataUrl';

export interface HighlightsData {
  month: string;
  gp: { grantsFilled: number; matchedFilled: number; pairs: number };
  dental: { vacant: number; tenYears: number };
}

let pending: Promise<HighlightsData | null> | null = null;

function load(): Promise<HighlightsData | null> {
  pending ??= fetch(dataUrl('highlights.json'))
    .then((r) => (r.ok ? r.json() as Promise<HighlightsData> : null))
    .catch(() => null);
  return pending;
}

export function useHighlights(): HighlightsData | null {
  const [data, setData] = useState<HighlightsData | null>(null);
  useEffect(() => {
    let alive = true;
    void load().then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);
  return data;
}
