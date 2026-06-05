import { Platform } from 'react-native';

// Visual tokens for the liquid-glass redesign (light, cool, airy), transcribed from the
// Claude Design handoff `glass.css`. These are pure display values and live entirely in the
// shell — the design layer never reaches into core.
//
// Light theme only: app.json pins `userInterfaceStyle: "light"`. The whole look is built on
// translucent white "glass" surfaces floating over an Apple-style gradient mesh (see
// SvgMesh), so the glass has something to refract.
export const theme = {
  // ---- Labels (cool near-black + iOS label tiers) ------------------------
  ink: '#15171C', // primary label
  label2: 'rgba(60,60,67,0.62)', // iOS secondary label
  label3: 'rgba(60,60,67,0.34)', // tertiary
  label4: 'rgba(60,60,67,0.20)', // quaternary / hairlines on glass

  // ---- Glass material ----------------------------------------------------
  glassFill: 'rgba(255,255,255,0.50)', // regular surface fill (the BlurView overlay tint)
  glassFillStrong: 'rgba(255,255,255,0.66)', // prominent surfaces (toolbars, sheets)
  glassHi: 'rgba(255,255,255,0.85)', // top inner highlight that sells the material
  glassEdge: 'rgba(255,255,255,0.55)', // hairline edge

  // ---- The neutral "not logged" slot -------------------------------------
  // Load-bearing: missing is a distinct grey, NEVER a topic color or a pale rank-0 tint
  // (CLAUDE.md invariant 1).
  missing: 'rgba(110,116,134,0.13)',
  missingRing: 'rgba(110,116,134,0.10)',

  // ---- Accent (FAB, active states, progress ring) ------------------------
  accent: '#5E5CE6',

  // ---- Radii -------------------------------------------------------------
  rCard: 28, // topic cards, grid card, settings groups
  rControl: 18, // selector segments, inputs
  rChip: 999, // pills / capsules
  rCell: 7, // soft-square heatmap cells

  // ===== Legacy tokens (brutalist paper) — still referenced by the not-yet-reskinned
  // Year / New Topic / Settings screens. Remove once Phase 2 reskins them. =====
  paper: '#F4F1E9',
  muted: 'rgba(60,60,67,0.62)',
  rule: 'rgba(60,60,67,0.20)',
  hair: 'rgba(60,60,67,0.12)',
  empty: 'rgba(110,116,134,0.13)',
  field: 'rgba(255,255,255,0.55)',
  radius: 0,
  glassRadius: 18,
  capsule: 999,
} as const;

// Spring + easing curves from the handoff (`--ease-spring`, `--ease-out`). Reanimated
// expresses these as spring configs rather than bezier strings; these tunings approximate
// the design's springy taps and smooth entrances.
export const motion = {
  // Springy overshoot for taps/selection (cubic-bezier(0.34,1.56,0.64,1)).
  spring: { damping: 14, stiffness: 220, mass: 0.7 },
  // Calmer spring for layout/opacity (cubic-bezier(0.22,1,0.36,1)).
  springSoft: { damping: 20, stiffness: 180, mass: 0.9 },
} as const;

// Fully clean SF-style type — no mono. `undefined` resolves to the system font (San
// Francisco on iOS, Roboto on Android), which is exactly the design's intent.
//
// `mono` is retained only for the legacy Year/Settings/New-Topic screens until Phase 2
// reskins them; it is unused by the redesigned screens.
export const fonts = {
  sans: undefined as string | undefined,
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
} as const;
