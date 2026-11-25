import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '../src/csv.ts';

describe('csv', () => {
  it('round-trips commas quotes and newlines', () => {
    expect(parseCsv(toCsv([{ a: 'x, "y"\nz' }], ['a']))).toEqual([['a'], ['x, "y"\nz']]);
  });

  it('writes null and undefined as empty cells', () => {
    expect(toCsv([{ a: null, b: undefined, c: 0, d: false }], ['a', 'b', 'c', 'd'])).toBe('a,b,c,d\n,,0,false\n');
  });

  it('joins string arrays with a semicolon and space', () => {
    expect(toCsv([{ a: ['x', 'y'] }], ['a'])).toBe('a\nx; y\n');
  });

  it('accepts CRLF and no trailing newline', () => {
    expect(parseCsv('a,b\r\n1,"2\r\n3"\r\n')).toEqual([['a', 'b'], ['1', '2\r\n3']]);
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('throws on an unterminated quote', () => {
    expect(() => parseCsv('a,b\n1,"2\n3,4\n')).toThrow(/unterminated/);
  });
});
