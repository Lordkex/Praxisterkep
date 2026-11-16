// The method page's formulas as MathML, which every current browser typesets
// on its own: a real fraction bar and root sign, read out by screen readers,
// and no maths library on a page that holds two formulas.
//
// A text in outcomeMethod marks where its formula goes with "{formula}"; a
// test holds the placeholders and this table to each other in both languages.

/** r with a subscript such as "xy·z" ("·": controlling for), optionally squared */
function r(sub: string, squared = false): string {
  const s = `<mrow>${[...sub].map((c) => (c === '·'
    ? '<mo lspace="0.08em" rspace="0.08em">·</mo>'
    : `<mi>${c}</mi>`)).join('')}</mrow>`;
  return squared ? `<msubsup><mi>r</mi>${s}<mn>2</mn></msubsup>` : `<msub><mi>r</mi>${s}</msub>`;
}

const op = (o: string) => `<mo>${o}</mo>`;
// plain brackets, as TeX sets them: a stretchy pair grows to the r² and towers over the 1
const paren = (o: string) => `<mo stretchy="false">${o}</mo>`;
const oneMinus = (sub: string) => `${paren('(')}<mn>1</mn>${op('−')}${r(sub, true)}${paren(')')}`;

/**
 * The partial correlation step: r_target = (r_xy − r_xz·r_yz) / √((1 − r_xz²)(1 − r_yz²)).
 * The second-order one is the same step taken on first-order partials.
 */
function partial(target: string, xy: string, xz: string, yz: string): string {
  return `<math display="block">${r(target)}${op('=')}<mfrac>`
    + `<mrow>${r(xy)}${op('−')}${r(xz)}${op('⁢')}${r(yz)}</mrow>`
    + `<msqrt><mrow>${oneMinus(xz)}${oneMinus(yz)}</mrow></msqrt>`
    + '</mfrac></math>';
}

export const FORMULAS: Record<string, string> = {
  stats: partial('xy·z', 'xy', 'xz', 'yz'),
  education: partial('xy·zw', 'xy·z', 'xw·z', 'yw·z'),
};
