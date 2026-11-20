// The orientation layers every map shares: city labels (county seats,
// county-rank cities, járás seats, larger towns) as DOM markers — so no glyph
// server is needed — plus járás and Budapest district borders as line layers,
// and optional county name labels for the maps that have none of their own.
//
// Labels never pile up: they are placed in order of rank (county seats first,
// then county names, county-rank cities, járás seats) and one that would
// overlap a label already placed, or a map's own county marker, is hidden
// until zooming in makes room for it.
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Marker, type Map as MLMap } from 'maplibre-gl';
import {
  cityVisible, loadCities, loadGeo, resolveLayers, useLayerChoice,
  type LayerChoice, type LayerState,
} from '../lib/mapLayers';
import { mapColors } from '../lib/mapColors';
import { useThemeTick } from '../lib/theme';

/** placement order: a lower number claims its room first */
const RANK_ORDER: Record<string, number> = { seat: 0, county: 2, jarasSeat: 3, town: 4 };
const COUNTY_LABEL_ORDER = 1;

interface Placed { marker: Marker; el: HTMLElement; order: number; centered: boolean; w: number; h: number }

/** hide every label that would overlap one placed before it */
function declutter(map: MLMap, items: Placed[]): void {
  const box = map.getContainer().getBoundingClientRect();
  // the map's own county markers (names, columns) are fixed obstacles
  const taken: [number, number, number, number][] = [];
  map.getContainer().querySelectorAll<HTMLElement>('.county-marker').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width) taken.push([r.left - box.left, r.top - box.top, r.right - box.left, r.bottom - box.top]);
  });
  for (const it of items) {
    if (!it.w) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
    const p = map.project(it.marker.getLngLat());
    const x0 = it.centered ? p.x - it.w / 2 : p.x - 4;
    const r: [number, number, number, number] = [x0 - 2, p.y - it.h / 2 - 1, x0 + it.w + 2, p.y + it.h / 2 + 1];
    const out = r[2] < 0 || r[0] > box.width || r[3] < 0 || r[1] > box.height;
    const hit = !out && taken.some((b) => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]);
    it.el.style.visibility = hit ? 'hidden' : '';
    if (!hit && !out) taken.push(r);
  }
}

/** layers the borders should stay underneath, in order of preference */
const BELOW = ['pts', 'praxes', 'county-marker'];

interface BorderLayer {
  id: string;
  file: string;
  /** which of mapColors() it is drawn in */
  color: 'jaras' | 'budapest';
  width: number;
}

const BORDERS: Record<'jaras' | 'budapest', BorderLayer> = {
  jaras: { id: 'jaras-outline', file: 'jaras', color: 'jaras', width: 0.7 },
  budapest: { id: 'bp-line', file: 'budapest', color: 'budapest', width: 1 },
};

function centroid(feature: GeoJSON.Feature): [number, number] | null {
  let minX = 180; let minY = 90; let maxX = -180; let maxY = -90; let seen = false;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as [number, number];
      seen = true;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk((feature.geometry as GeoJSON.Polygon)?.coordinates);
  return seen ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

/**
 * `mapDefaults` lets a map keep its own starting point (the main map shows
 * county names from the start); `countyLabels: false` is for maps that draw
 * their own county markers.
 */
export function useOrientationLayers(
  mapRef: RefObject<MLMap | null>,
  mapDefaults: LayerChoice = {},
  countyLabels = true,
): LayerState {
  const choice = useLayerChoice();
  const defaultsKey = JSON.stringify(mapDefaults);
  const layers = useMemo(
    () => resolveLayers(choice, JSON.parse(defaultsKey) as LayerChoice),
    [choice, defaultsKey],
  );
  const markersRef = useRef<Marker[]>([]);
  const themeTick = useThemeTick();

  // city (and optionally county) labels
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let items: Placed[] = [];
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const map = mapRef.current;
        if (map && items.length) declutter(map, items);
      });
    };
    const wantCounties = countyLabels && layers.counties;
    void Promise.all([loadCities(), wantCounties ? loadGeo('counties') : null])
      .then(([cities, counties]) => {
        const map = mapRef.current;
        if (cancelled || !map) return;
        markersRef.current.forEach((m) => m.remove());
        const placed: Placed[] = [];
        for (const city of cities) {
          if (!cityVisible(city, layers)) continue;
          const el = document.createElement('div');
          el.className = `map-city map-city--${city.rank}`;
          const dot = document.createElement('i');
          const label = document.createElement('span');
          label.textContent = city.name;
          el.append(dot, label);
          const marker = new Marker({ element: el, anchor: 'left' })
            .setLngLat([city.lon, city.lat]).addTo(map);
          placed.push({ marker, el, order: RANK_ORDER[city.rank] ?? 9, centered: false, w: 0, h: 0 });
        }
        for (const feature of counties?.features ?? []) {
          const center = centroid(feature);
          if (!center) continue;
          const el = document.createElement('div');
          el.className = 'map-county-label';
          el.textContent = String(feature.properties?.name ?? '');
          const marker = new Marker({ element: el }).setLngLat(center).addTo(map);
          placed.push({ marker, el, order: COUNTY_LABEL_ORDER, centered: true, w: 0, h: 0 });
        }
        items = placed.sort((a, b) => a.order - b.order);
        markersRef.current = placed.map((p) => p.marker);
        map.on('move', schedule);
        map.on('resize', schedule);
        schedule();
        // the map's own county markers may land a moment later
        window.setTimeout(schedule, 400);
      });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      mapRef.current?.off('move', schedule);
      mapRef.current?.off('resize', schedule);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [layers, mapRef, countyLabels]);

  // járás and Budapest district borders, added the first time they are asked for
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const apply = () => {
      const map = mapRef.current;
      if (cancelled || !map) return;
      for (const [key, border] of Object.entries(BORDERS) as ['jaras' | 'budapest', BorderLayer][]) {
        const on = layers[key];
        if (map.getLayer(border.id)) {
          map.setLayoutProperty(border.id, 'visibility', on ? 'visible' : 'none');
          map.setPaintProperty(border.id, 'line-color', mapColors()[border.color]);
          continue;
        }
        if (!on) continue;
        void loadGeo(border.file).then((fc) => {
          const m = mapRef.current;
          if (cancelled || !m || !fc || m.getLayer(border.id)) return;
          try {
            if (!m.getSource(border.id)) {
              m.addSource(border.id, { type: 'geojson', data: fc });
            }
            m.addLayer({
              id: border.id, type: 'line', source: border.id,
              paint: { 'line-color': mapColors()[border.color], 'line-width': border.width },
            }, BELOW.find((id) => m.getLayer(id)));
          } catch {
            // the style is not ready yet — try again shortly
            timer = window.setTimeout(apply, 200);
          }
        });
      }
    };
    apply();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [layers.jaras, layers.budapest, layers, mapRef, themeTick]);

  return layers;
}
