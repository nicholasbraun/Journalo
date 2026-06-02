// The topic color palette: the swatches shown on the New Topic screen, and the set
// a topic's stored `color` is chosen from. Shared presentation (it will be reused by
// topic editing and the year-grid), so it lives in ui/ alongside theme + colorRamp.
//
// Provenance: the Claude design handoff defines colors in oklch as (hue, cMax) pairs
// and derives a per-level intensity ramp from them. React Native's color parser does
// not accept oklch, and colorRamp.ts already recomputes the ramp as an sRGB white→base
// mix from a single base hex (see its header for why). So each preset is frozen here
// as ONE base hex — the design's oklch evaluated at the picker's displayed step
// (level 4 of a 5-level scale, L≈0.533) — and buildRamp derives the pale→dark ramp
// from it. Hues, in order: 27 45 58 95 152 195 252 305 350.
export const TOPIC_COLORS: readonly string[] = [
  '#b73c36', // red
  '#a75023', // orange
  '#935e34', // brown
  '#836a00', // olive
  '#1b8145', // green
  '#007e7f', // teal
  '#276eb7', // blue
  '#7e56a8', // violet
  '#a54578', // magenta
];

// A topic requires a color, so the New Topic screen pre-selects one. This is a
// display default, NOT the "no pre-selected value" logging invariant (which governs
// ranks/values, not a topic's color) — see CLAUDE.md invariant 2.
export const DEFAULT_TOPIC_COLOR = TOPIC_COLORS[0];
