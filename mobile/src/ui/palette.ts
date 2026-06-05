// The topic color palette: the swatches shown on the New Topic screen, and the set
// a topic's stored `color` is chosen from. Shared presentation (reused by topic editing
// and the year grid), so it lives in ui/ alongside theme + colorRamp.
//
// Vivid, iOS-flavoured hues (the design's "brighten toward vivid iOS colors" direction).
// A topic stores ONE base hex — its strongest level — and colorRamp derives the pale→dark
// per-rank ramp from it as a white→base mix (see colorRamp.ts for why we don't store the
// whole ramp).
export const TOPIC_COLORS: readonly string[] = [
  '#FF453A', // red
  '#FF9F0A', // orange
  '#FFCC00', // yellow
  '#34C759', // green
  '#30D0B6', // teal
  '#32ADE6', // cyan
  '#0A84FF', // blue
  '#BF5AF2', // purple
  '#FF375F', // pink
];

// A topic requires a color, so the New Topic screen pre-selects one. This is a
// display default, NOT the "no pre-selected value" logging invariant (which governs
// ranks/values, not a topic's color) — see CLAUDE.md invariant 2.
export const DEFAULT_TOPIC_COLOR = '#BF5AF2'; // purple, the design's default swatch
