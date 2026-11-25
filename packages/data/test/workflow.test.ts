import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const path = fileURLToPath(new URL('../../../.github/workflows/npm-data.yml', import.meta.url));
const text = readFileSync(path, 'utf8');

describe('npm-data workflow', () => {
  it('waits for the owner and publishes with provenance', () => {
    for (const s of ['environment: npm-publish', 'id-token: write', '--provenance', '--latest=false', 'data-']) {
      expect(text).toContain(s);
    }
  });
  it('runs after the monthly ETL and skips versions already on npm', () => {
    for (const s of ['workflow_run', 'monthly-etl', 'npm view hungarian-praxismap@', 'workflow_dispatch']) {
      expect(text).toContain(s);
    }
  });
  it('uses no npm token', () => {
    expect(text).not.toContain('NPM_TOKEN');
    expect(text).not.toMatch(/NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets/);
  });
  it('never cancels a running publish', () => {
    expect(text).toContain('group: npm-data');
    expect(text).toContain('cancel-in-progress: false');
  });
  it('makes every irreversible step idempotent and restricted to main', () => {
    for (const s of ['branches: [main]', 'gh release view', 'git ls-remote', "github.ref == 'refs/heads/main'"]) {
      expect(text).toContain(s);
    }
  });
  it('never puts workflow inputs into a shell script', () => {
    const lines = text.split('\n');
    expect(lines.filter((l) => /^\s*(- )?run:.*\$\{\{\s*inputs\./.test(l))).toEqual([]);
    for (const l of lines.filter((l) => l.includes('${{ inputs.'))) {
      expect(l).toMatch(/^\s+PATCH: /);
    }
  });
  it('tags a version already on npm at the commit its published manifest names', () => {
    const tag = text.slice(text.indexOf('- name: Tag'), text.indexOf('- name: Release'));
    for (const s of ['npm pack hungarian-praxismap@"$VERSION"', 'package/manifest.json', '.commit', 'git merge-base --is-ancestor', 'origin/main', 'GITHUB_ENV']) {
      expect(tag).toContain(s);
    }
    const release = text.slice(text.indexOf('- name: Release'));
    expect(release).toContain('--target "$COMMIT"');
    expect(release).not.toContain('needs.build.outputs.commit');
  });
  it('counts a version as published only when npm view prints exactly that version', () => {
    const views = text.split('\n').filter((l) => l.includes('npm view hungarian-praxismap@'));
    expect(views.length).toBeGreaterThanOrEqual(2);
    expect(text.match(/\[ "\$out" !?= "\$(VERSION|version)" \]/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it('says how to add a missing CHANGELOG section, in the error and the header', () => {
    expect(text).toContain('add \\"## $VERSION - <YYYY-MM-DD>\\" with a short note to packages/data/CHANGELOG.md on main, push, then run this workflow by hand');
    const header = text.slice(0, text.indexOf('name: npm-data'));
    expect(header).toContain('packages/data/CHANGELOG.md');
  });
});
