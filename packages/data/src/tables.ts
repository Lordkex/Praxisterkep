import type { County, Snapshot } from './types.ts';

export const COORDINATE_COLUMNS = ['id', 'siteIndex', 'lat', 'lon', 'geoApprox'];

type Table = { columns: string[]; rows(s: Snapshot): Record<string, unknown>[] };

const split = (s: string): string[] => s.split(',');

const praxes: Table = {
  columns: split('id,kind,type,status,county,countyCode,vacantSince,longTerm,longTermSince,population,servedSettlements,siteIndex,isHeadquarters,settlement,district,postalCode,address,addressRaw,geoApprox'),
  rows: (s) =>
    s.praxes.flatMap((p) =>
      p.sites.map((site, siteIndex) => ({
        id: p.id, kind: p.kind, type: p.type, status: p.status, county: p.county, countyCode: p.countyCode,
        vacantSince: p.vacantSince, longTerm: p.longTerm, longTermSince: p.longTermSince,
        population: p.population, servedSettlements: p.servedSettlements, siteIndex,
        isHeadquarters: site.isHeadquarters, settlement: site.settlement, district: site.district,
        postalCode: site.postalCode, address: site.address, addressRaw: site.addressRaw,
        geoApprox: site.geoApprox,
      })),
    ),
};

const filled: Table = {
  columns: split('id,type,county,district,settlement,postalCode,address,addressRaw,level,neakCode,servedSettlements'),
  rows: (s) => s.filledPraxes.map((f) => ({ ...f })),
};

const countyRow = (c: County): Record<string, unknown> => ({
  name: c.name, total: c.total, vacant: c.vacant, dissolved: c.dissolved, longTerm: c.longTerm,
  vacancyRate: c.vacancyRate, praxesPer10k: c.praxesPer10k, populationTotal: c.populationTotal,
  populationVacant: c.populationVacant, populationDissolved: c.populationDissolved,
  populationShare: c.populationShare,
  adultTotal: c.byType.adult?.total, adultVacant: c.byType.adult?.vacant,
  childTotal: c.byType.child?.total, childVacant: c.byType.child?.vacant,
  mixedTotal: c.byType.mixed?.total, mixedVacant: c.byType.mixed?.vacant,
  schoolTotal: c.byType.school?.total, schoolVacant: c.byType.school?.vacant,
});

const counties: Table = {
  columns: split('name,total,vacant,dissolved,longTerm,vacancyRate,praxesPer10k,populationTotal,populationVacant,populationDissolved,populationShare,adultTotal,adultVacant,childTotal,childVacant,mixedTotal,mixedVacant,schoolTotal,schoolVacant'),
  rows: (s) => s.counties.map(countyRow),
};

const settlements: Table = {
  columns: split('kshId,name,county,population,filled,vacant,vacantPraxisIds,dissolvedPraxisIds,affectedByDissolved'),
  rows: (s) =>
    s.settlements.map((t) => ({
      kshId: t.kshId, name: t.name, county: t.county, population: t.population, filled: t.filled,
      vacant: t.vacantPraxisIds.length, vacantPraxisIds: t.vacantPraxisIds,
      dissolvedPraxisIds: t.dissolvedPraxisIds, affectedByDissolved: t.affectedByDissolved,
    })),
};

export const TABLES: Record<'praxes' | 'filled' | 'counties' | 'settlements', Table> = {
  praxes, filled, counties, settlements,
};
