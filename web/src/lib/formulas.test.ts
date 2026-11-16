// A formula with no "{formula}" mark in its text is never shown; a mark with
// no formula is printed to the reader as the literal "{formula}".
import { describe, expect, it } from 'vitest';
import hu from '../i18n/hu.json';
import en from '../i18n/en.json';
import { FORMULAS } from './formulas';
import { OUTCOME_ITEMS } from './methodSections';

type Texts = Record<string, { text: string }>;

describe('outcome method formulas', () => {
  it.each([['hu', hu], ['en', en]] as const)('%s: every mark has a formula and every formula a mark', (_, dict) => {
    const texts = (dict as unknown as { outcomeMethod: Texts }).outcomeMethod;
    for (const k of OUTCOME_ITEMS) {
      const marks = texts[k].text.split('{formula}').length - 1;
      expect(marks, k).toBe(k in FORMULAS ? 1 : 0);
    }
    for (const k of Object.keys(FORMULAS)) expect(OUTCOME_ITEMS, k).toContain(k);
  });

  it('typesets a fraction under a root', () => {
    for (const f of Object.values(FORMULAS)) {
      expect(f).toMatch(/^<math display="block">.*<mfrac>.*<msqrt>.*<\/math>$/);
    }
    expect(FORMULAS.education).toContain('<mi>w</mi>');
  });
});
