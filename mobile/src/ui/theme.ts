import { Platform } from 'react-native';

// The quick-log screen's visual tokens, transcribed from the Claude design handoff
// (default "bone" light theme, square corners). These are pure display values and
// live entirely in the shell — the design layer never reaches into core.
//
// Light theme only this session: app.json pins `userInterfaceStyle: "light"`, and
// the design's default tweak is light. Dark mode is a cheap later add (the handoff
// ships a dark palette) but is out of scope here.
export const theme = {
  paper: '#F4F1E9', // screen background
  ink: '#16140E', // primary text and the heavy brutalist borders
  muted: '#6E6A5E', // secondary text, un-logged labels
  rule: 'rgba(22,20,14,0.26)', // hairline dividers between rows / segments
  hair: 'rgba(22,20,14,0.17)', // a fainter hairline than `rule` — unselected swatch borders, preview segment dividers
  empty: '#DED9CD', // the NEUTRAL grey reserved for "missing" — never a topic color
  field: '#FCFBF7',
  // Square corners are the design default (`radius: "square"` => 0px). Kept as a
  // token so a future radius tweak is one edit, not a hunt through the screen.
  radius: 0,
  // Rounded radii reserved for FLOATING liquid-glass chrome only. Native Liquid Glass
  // reads as a soft, capsule-edged material, so the glass toolbar/buttons that hover
  // over scrolling content round their corners — while `radius: 0` stays the law for
  // the brutalist paper content beneath them. Full-bleed glass (the top headers) keeps
  // square corners since it meets the screen edges.
  glassRadius: 18,
  capsule: 999,
} as const;

// The handoff uses Helvetica Neue (≈ system sans on iOS) and JetBrains Mono. We use
// the platform fonts this session rather than bundling JetBrains Mono via expo-font
// + a font asset — a deliberate fidelity-for-zero-dependency trade. The mono face
// still carries the design's mono micro-labels (kicker, counter, status tags); the
// exact JetBrains face can be added later if pixel fidelity matters.
export const fonts = {
  sans: Platform.select({ ios: 'Helvetica Neue', default: undefined }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
} as const;
