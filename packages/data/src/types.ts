export type Kind = 'gp' | 'dental';
export type PraxisType = 'adult' | 'child' | 'mixed' | 'school';

export interface ByTypeEntry { total: number | null; vacant: number }
export interface ByType { adult: ByTypeEntry; child: ByTypeEntry; mixed: ByTypeEntry; school: ByTypeEntry }

interface Counts {
  vacant: number;
  dissolved: number;
  longTerm?: number;
  vacancyRate: number | null;
  praxesPer10k: number | null;
  populationTotal: number;
  populationVacant: number;
  populationDissolved: number;
  populationShare: number;
  byType: ByType;
}

export interface National extends Counts { totalDistricts: number | null }
export interface County extends Counts { name: string; total: number | null }

export interface Site {
  address: string;
  addressRaw?: string;
  district: string;
  settlement: string;
  postalCode: string;
  isHeadquarters: boolean;
  geoApprox: boolean;
}

export interface Praxis {
  id: string;
  kind: Kind;
  type: PraxisType;
  status: 'vacant' | 'vacant_longterm' | 'dissolved';
  county: string;
  countyCode: string;
  vacantSince: string;
  longTerm?: boolean;
  longTermSince?: string;
  population: number;
  servedSettlements?: string[];
  sites: Site[];
}

export interface FilledPraxis {
  id: string;
  type: PraxisType;
  county: string;
  district?: string;
  settlement: string;
  postalCode: string;
  address: string;
  addressRaw?: string;
  level?: string;
  neakCode?: string;
  servedSettlements?: string[];
}

export interface Settlement {
  kshId: string;
  name: string;
  county: string;
  population: number;
  filled: number;
  vacantPraxisIds: string[];
  dissolvedPraxisIds?: string[];
  affectedByDissolved: boolean;
}

export interface Snapshot {
  schemaVersion: number;
  kind: Kind;
  month: string;
  disclaimer: string;
  sources: string[];
  longTermAsOf?: string | null;
  national: National;
  counties: County[];
  praxes: Praxis[];
  filledPraxes: FilledPraxis[];
  settlements: Settlement[];
}

export interface CoordinateRow { id: string; siteIndex: number; lat: number; lon: number; geoApprox: boolean }

export type RawRole = 'registry' | 'vacant' | 'dissolved' | 'okfo' | 'other';
export interface RawEntry { name: string; role: RawRole; sha256: string; bytes: number; url: string }
export interface ManifestEntry {
  schemaVersion: number;
  sources: string[];
  longTermAsOf: string | null;
  files: Record<string, { sha256: string; bytes: number }>;
  raw: RawEntry[] | null;
  missingRaw: ('registry' | 'vacant')[];
}
export interface Manifest {
  package: 'hungarian-praxismap';
  version: string;
  built: string;
  commit: string;
  conceptDoi: '10.5281/zenodo.23460426';
  tag: `data-${string}`;
  licences: { code: 'MIT'; data: 'CC-BY-4.0'; coordinates: 'ODbL-1.0' };
  disclaimer: string;
  months: Record<string, Partial<Record<Kind, ManifestEntry>>>;
}
