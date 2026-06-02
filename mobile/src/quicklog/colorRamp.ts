// Derive a per-rank intensity ramp from a topic's single stored base color.
//
// Why this is shell code, not core: a topic in core has ONE `color` (display-only,
// freely changeable — see CLAUDE.md "Display/behavior settings"). The "darker = more"
// gradient across a scale is a pure rendering concern, so it belongs here. The design
// expresses the ramp in `oklch(...)`, which React Native's color parser does not
// accept; we therefore compute the ramp ourselves and emit `rgb()` strings RN does.
//
// The ramp runs from a pale-but-visible tint at the lowest rank up to the full base
// color at the highest. The pale FLOOR is the load-bearing detail: the lowest logged
// rank must still read as a colored value, never as the neutral "missing" grey
// (CLAUDE.md invariant 1 — missing ≠ rank 0). A logged rank 0 is a value, just a low
// one, so it keeps the topic's hue.

type RGB = { readonly r: number; readonly g: number; readonly b: number };

const WHITE: RGB = { r: 255, g: 255, b: 255 };

// Lowest rank still tints this far toward the full color, so it is a pale wash of the
// topic hue rather than washing out to white/grey. Mirrors the design's 0.18 floor.
const TINT_FLOOR = 0.18;

// Below this perceived luminance the fill is dark enough to need light text on it.
const LIGHT_TEXT_THRESHOLD = 0.6;
const ON_DARK = '#F4F1E9'; // paper-colored text on a dark fill
const ON_LIGHT = '#16140E'; // ink text on a light fill

function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const lerp = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);

const mix = (from: RGB, to: RGB, t: number): RGB => ({
  r: lerp(from.r, to.r, t),
  g: lerp(from.g, to.g, t),
  b: lerp(from.b, to.b, t),
});

const css = (c: RGB): string => `rgb(${c.r}, ${c.g}, ${c.b})`;

// Perceived luminance in 0..1 (Rec. 709 coefficients) — used only to pick legible
// text, not for the ramp itself.
const luminance = (c: RGB): number =>
  (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;

// The intensity fraction for a rank: 0 (lowest) maps to TINT_FLOOR, the top rank to
// 1.0, spread evenly between. A single-level scale (levels === 1) has no gradient and
// sits at full color.
function intensity(rank: number, levels: number): number {
  if (levels <= 1) return 1;
  return TINT_FLOOR + (1 - TINT_FLOOR) * (rank / (levels - 1));
}

export type Ramp = {
  // Background fill for a SET segment at this rank. Only ever called for logged
  // ranks; an absent cell renders no fill at all (the empty token shows through).
  readonly fill: (rank: number) => string;
  // Legible text color to sit on `fill(rank)`.
  readonly textOn: (rank: number) => string;
  // Representative chip color for the row's topic swatch (the full base color).
  readonly swatch: string;
};

// Build the ramp for one topic. `levels` is the topic's fixed scale granularity.
export function buildRamp(baseHex: string, levels: number): Ramp {
  const base = parseHex(baseHex);
  const fillAt = (rank: number): RGB => mix(WHITE, base, intensity(rank, levels));
  return {
    fill: (rank) => css(fillAt(rank)),
    textOn: (rank) =>
      luminance(fillAt(rank)) < LIGHT_TEXT_THRESHOLD ? ON_DARK : ON_LIGHT,
    swatch: css(base),
  };
}
