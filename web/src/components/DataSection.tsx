// "Adatok" — every file the site serves, with what it contains, how big it is
// and where it came from, so anyone can build on the same numbers. The list
// comes from the manifest the sync step writes, never from a hardcoded list,
// so the page cannot advertise a file that is not there.
import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { SITE_URL } from '../lib/site';
import { formatNumber } from '../lib/format';
import { dataUrl } from '../lib/dataUrl';

interface ManifestFile {
  path: string;
  bytes: number;
  modified: string;
  count?: number;
  from?: string;
  to?: string;
  /** months/ only: the files of its newest month ("dental.json", "gp.json") */
  latest?: string[];
}

interface Manifest {
  generated: string;
  files: ManifestFile[];
}

/** the files we can describe; anything else is listed without a description */
const DESCRIBED = new Set([
  'latest.json', 'timeseries.json', 'history.json', 'months/', 'eeszt.json',
  'dental_extra.json', 'crosscheck.json', 'access.json', 'providers.json',
  'operating.json', 'kedvezmenyezett.json', 'counties.geojson', 'jaras.geojson',
  'cities.geojson', 'budapest.geojson', 'vedono.json', 'specialist.json',
  'risk.json', 'survival.json', 'coverage.json', 'composite.json', 'age.json',
  'settlements.geojson', 'emergency.json', 'clusters.json',
  'traveltime.json', 'transit.json', 'officialmap.json', 'gyse.json',
  'settlement_slugs.json', 'pipeline.json', 'referral.json', 'pharmacy.json',
  'licence_history.json', 'counties.json', 'tenure.json',
  'fluctuation.json', 'changes.json', 'districts.json', 'district_development.json', 'outcomes.json',
  'census.json', 'grants.json', 'forecast.json', 'europe.json', 'europe_geo.json',
  'europe_summary.json', 'highlights.json',
]);

/** "access.json" -> "access_json", "months/" -> "months" (t() splits on dots) */
function keyOf(path: string): string {
  return path.replace(/\/$/, '').replace(/[./]/g, '_');
}

function size(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function DataSection() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    let alive = true;
    void fetch(dataUrl('manifest.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => { if (alive) setManifest(m); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!manifest?.files?.length) return null;
  const base = `${SITE_URL}/data/`;
  // the published address, whatever host the page was opened on: a snippet
  // copied from a preview deployment must still point at the real site
  const snippet = `<iframe src="${SITE_URL}/embed.html?k=dental" width="100%" height="420" style="border:0" loading="lazy" title="Praxistérkép"></iframe>`;

  return (
    <section className="section container" id="adatok">
      <div className="section__heading-row">
        <h2 className="section__heading">{t('data.heading')}</h2>
      </div>
      <p className="section__explain">{t('data.explain')}</p>

      <div className="data-files">
        <table className="info-table data-files__table">
          <thead>
            <tr>
              <th>{t('data.thFile')}</th>
              <th>{t('data.thContent')}</th>
              <th className="is-num">{t('data.thSize')}</th>
              <th className="is-num">{t('data.thUpdated')}</th>
            </tr>
          </thead>
          <tbody>
            {manifest.files.map((f) => (
              <tr key={f.path}>
                <td>
                  {f.path.endsWith('/') ? (
                    <code>{f.path}</code>
                  ) : (
                    <a href={`${base}${f.path}`} download>
                      <code>{f.path}</code>
                    </a>
                  )}
                </td>
                <td>
                  {DESCRIBED.has(f.path) ? t(`data.file.${keyOf(f.path)}`) : t('data.fileOther')}
                  {f.count ? ` (${formatNumber(f.count)} ${t('data.months')}: ${f.from} – ${f.to})` : ''}
                  {/* a folder has no single file to download: a static host
                      cannot list or zip it, so the row names the address of
                      one month and links the newest one */}
                  {f.path === 'months/' && f.to && f.latest?.length ? (
                    <span className="data-files__sub">
                      {t('data.monthsEach', { month: f.to })}
                      {f.latest.map((name, i) => (
                        <span key={name}>
                          {i ? ' · ' : ' '}
                          <a href={`${base}months/${f.to}/${name}`} download><code>{name}</code></a>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </td>
                <td className="is-num">{size(f.bytes)}</td>
                <td className="is-num">{f.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section__subheading">{t('data.useHeading')}</h3>
      <ul className="info-list">
        <li>{t('data.use1')}</li>
        <li>{t('data.use2')}</li>
        <li>{t('data.use3')}</li>
      </ul>
      <pre className="embed-snippet"><code>{`curl -O ${base}latest.json`}</code></pre>

      <h3 className="section__subheading" id="m-embed">{t('methodology.embedTitle')}</h3>
      <p className="section__explain">{t('methodology.embedText')}</p>
      <pre className="embed-snippet"><code>{snippet}</code></pre>
    </section>
  );
}
