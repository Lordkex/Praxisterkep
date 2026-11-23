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
});
