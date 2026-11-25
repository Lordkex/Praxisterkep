import { describe, expect, it } from 'vitest';
import { versionFor } from '../build/version.ts';

describe('versionFor', () => {
  it('builds a calendar version without leading zero', () => {
    expect(versionFor('2026-11', 0)).toBe('2026.11.0');
    expect(versionFor('2027-01', 0)).toBe('2027.1.0');
    expect(versionFor('2026-11', 2)).toBe('2026.11.2');
  });
  it('rejects bad input', () => {
    expect(() => versionFor('2026-13', 0)).toThrow();
    expect(() => versionFor('2026-11', -1)).toThrow();
  });
});
