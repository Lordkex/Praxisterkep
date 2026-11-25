import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { versionFor } from '../build/version.ts';

const read = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const FIX = new URL('./fixtures/data', import.meta.url);

describe('package docs', () => {
  const readme = read('README.md');

  it('README names the package, the DOI, the licences, the disclaimer and the vacancy rule', () => {
    for (const s of ['hungarian-praxismap', '10.5281/zenodo.23460426', 'ODbL', 'tájékoztató jellegű', 'Betöltetlen ≠ ellátatlan',
      'A NEAK adatai tájékoztató jellegűek.', 'CC BY 4.0', 'MIT', 'data-{{VERSION}}', 'hungarian-praxismap@{{VERSION}}/'])
      expect(readme).toContain(s);
  });

  it('README carries an empty months block for the build to fill', () => {
    expect(readme).toMatch(/<!-- months -->\s*<!-- \/months -->/);
  });

  it('README hardcodes no package version outside the first-release note', () => {
    const rest = readme.replace(/\(2026\.11\.0\)/g, '');
    expect(rest).not.toMatch(/\b\d{4}\.\d{1,2}\.\d+\b/);
  });

  it('no forbidden words in the docs', () => {
    for (const f of ['README.md', 'LICENSE.md', 'CHANGELOG.md']) {
      const t = read(f);
      for (const bad of ['vármegye', 'Vármegye', 'Claude', 'Generated with', 'Co-Authored', 'Dúl'])
        expect(t, `${f} contains ${bad}`).not.toContain(bad);
    }
  });

  it('template author is Dul Zoltán', () => {
    expect(JSON.parse(read('package.template.json')).author).toBe('Dul Zoltán');
  });

  it('CHANGELOG has a heading for the version the fixture build yields', () => {
    const latest = readdirSync(FIX).filter((d) => /^\d{4}-\d{2}$/.test(d)).sort().at(-1)!;
    const v = versionFor(latest, 0);
    expect(read('CHANGELOG.md')).toMatch(new RegExp(`^## ${v.replace(/\./g, '\\.')} - \\d{4}-\\d{2}-\\d{2}$`, 'm'));
  });

  it('LICENSE names all three licences', () => {
    const t = read('LICENSE.md');
    for (const s of ['MIT', 'CC BY 4.0', 'ODbL 1.0', 'OpenStreetMap', 'Dul Zoltán']) expect(t).toContain(s);
  });
});
