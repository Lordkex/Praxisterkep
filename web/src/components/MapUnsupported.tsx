import { t } from '../lib/i18n';

/** Stands in the map's box where the browser has no WebGL. */
export function MapUnsupported() {
  return <p className="map-unsupported" role="status">{t('map.unsupported')}</p>;
}
