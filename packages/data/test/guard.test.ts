import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strip } from '../build/allowlist.ts';
import { collectNames, guardOutput } from '../build/guard.ts';

const fixture = (month: string, kind: string): any =>
  JSON.parse(readFileSync(new URL(`./fixtures/data/${month}/${kind}.json`, import.meta.url), 'utf8'));

const raw = fixture('2026-10', 'gp');
const names = collectNames([{ where: '2026-10/gp.json', data: raw }]);
const msg = (fn: () => void): string => {
  try { fn(); } catch (e) { return (e as Error).message; }
  return '';
};

describe('collectNames', () => {
  it('collects normalised doctor and provider values, ignoring empties and non-strings', () => {
    const set = collectNames([
      { where: 'a', data: { filledPraxes: [{ doctor: ' Dr.  X  Y ', provider: '' }, { doctor: null, provider: 5 }] } },
      { where: 'b', data: {} },
    ]);
    expect([...set]).toEqual(['Dr. X Y']);
    expect(names.has('Teszt Bt.')).toBe(true);
    expect(names.has('Dr. Teszt Elek')).toBe(true);
  });
});

describe('guardOutput', () => {
  it('passes clean output', () => {
    const json = JSON.stringify(strip(raw, '2026-10/gp.json').json);
    expect(() =>
      guardOutput(names, [
        { path: 'a/gp.json', text: json },
        { path: 'a/gp.csv', text: 'id,address\n1,Dr. Pikó Béla u. 3.\n' },
      ]),
    ).not.toThrow();
  });

  it('reports every collision with its location', () => {
    const json = JSON.stringify({ filledPraxes: [{ address: 'Teszt Bt.' }] });
    const csv = 'id,address\n1,ok\n2,"Teszt  Bt."\n';
    const m = msg(() => guardOutput(names, [{ path: 'x/a.json', text: json }, { path: 'x/b.csv', text: csv }]));
    expect(m).toContain('x/a.json /filledPraxes/0/address "Teszt Bt."');
    expect(m).toContain('x/b.csv 3:address "Teszt Bt."');
  });

  it('checks each part of a "; "-joined cell', () => {
    const m = msg(() => guardOutput(names, [{ path: 'b.csv', text: 'id,s\n1,Foo; Teszt Bt.\n' }]));
    expect(m).toContain('b.csv 2:s "Teszt Bt."');
  });

  it('is exact, case-sensitive and whole-value', () => {
    const n = new Set(['Dr. Pikó Béla', 'Teszt Bt.']);
    expect(() =>
      guardOutput(n, [{ path: 'a.json', text: JSON.stringify({ a: 'Dr. Pikó Béla u. 3.', b: 'teszt bt.' }) }]),
    ).not.toThrow();
  });

  it('rejects a forbidden key, even with an empty value', () => {
    for (const key of ['doctor', 'provider']) {
      const m = msg(() => guardOutput(new Set(), [{ path: 'k.json', text: JSON.stringify({ a: [{ [key]: '' }] }) }]));
      expect(m).toContain(`k.json /a/0/${key}`);
    }
  });

  it('catches a name used as an object key', () => {
    const m = msg(() => guardOutput(names, [{ path: 'k.json', text: JSON.stringify({ 'Teszt Bt.': 1 }) }]));
    expect(m).toContain('k.json /Teszt Bt.');
  });

  it('ignores other extensions', () => {
    expect(() => guardOutput(names, [{ path: 'a.txt', text: 'Teszt Bt.' }])).not.toThrow();
  });
});
