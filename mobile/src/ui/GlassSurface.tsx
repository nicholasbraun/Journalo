import { type ReactNode } from 'react';
import { Platform, type StyleProp, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';

import { theme } from './theme';

// Whether real Liquid Glass can render: iOS 26+ only. The OS version cannot change while the
// app runs, so resolve it once at module load.
const GLASS = isLiquidGlassAvailable();

// Real blur (expo-blur BlurView) is used on iOS below 26. On Android we deliberately skip
// the BlurView — a full-screen blur behind every card is a real perf cost there — and fall
// back to a flat translucent-white fill, which still reads as a light glass panel over the
// gradient mesh.
const CAN_BLUR = Platform.OS === 'ios' && !GLASS;

type Props = ViewProps & {
  // Corner radius of the surface (use the theme r* tokens). The blur is clipped to it.
  radius?: number;
  // Prominent surfaces (toolbars, sheets) use the denser 0.66 fill; default is 0.50.
  strong?: boolean;
  // iOS-26 GlassView tuning only — ignored on the blur/flat fallback.
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  isInteractive?: boolean;
  // Skip the top-highlight + hairline edge overlay (the detail that "sells" the material on
  // the fallback path). Real GlassView always draws its own edge, so the overlay is
  // fallback-only regardless.
  noEdge?: boolean;
  // Extra styles applied ONLY on the non-glass fallback (e.g. a solid accent fill for a
  // primary button that can't tint real glass).
  fallbackStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// A glass surface: native Liquid Glass on iOS 26+, a frosted BlurView on older iOS, and a
// flat translucent-white panel on Android. The whole app floats these over the SvgMesh, so
// the translucency always has the gradient to refract. This is the SINGLE place the
// material-vs-fallback split lives; screens compose `GlassSurface` and never import
// expo-glass-effect / expo-blur directly.
export function GlassSurface({
  radius = theme.rCard,
  strong = false,
  glassEffectStyle = 'regular',
  tintColor,
  isInteractive,
  noEdge = false,
  fallbackStyle,
  style,
  children,
  ...rest
}: Props) {
  // The crisp top highlight + hairline edge that "sells" the material and gives a card a
  // visible silhouette. RN has no inset box-shadow, so this is a bordered overlay: a faint
  // hairline all round, a brighter 1px line along the top. Drawn on BOTH the real-glass and
  // fallback paths — the system Liquid Glass material alone reads as nearly edgeless over a
  // light mesh, so the explicit edge is what makes a glass card look like a card.
  const edge =
    noEdge ? null : (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.glassEdge,
            borderTopWidth: 1,
            borderTopColor: theme.glassHi,
          },
        ]}
      />
    );

  const fill = strong ? theme.glassFillStrong : theme.glassFill;

  if (GLASS) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        // Light mode is pinned app-wide (app.json `userInterfaceStyle: "light"`).
        colorScheme="light"
        style={[{ borderRadius: radius }, style]}
        {...rest}
      >
        {/* The system Liquid Glass material alone is nearly clear over a light mesh, so a
            non-tinted card reads as edgeless and floats indistinctly. Lay a translucent-white
            fill over the material (matching the design's `--glass-fill`) so the card gets the
            frosted-light background that lifts it off the mesh — while the material still
            refracts through the translucency. A TINTED surface (the "+" FAB) keeps the pure
            accent material and gets no white wash. */}
        {!tintColor && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: fill }]}
          />
        )}
        {children}
        {edge}
      </GlassView>
    );
  }

  // A TINTED surface (a prominent button like the "+" FAB) has no airy-glass analog off
  // iOS 26 — washing an accent through a white glass fill would mute it. So the fallback for
  // a tinted surface is a solid fill of the tint: same prominence, no blur, no white overlay.
  if (tintColor) {
    return (
      <View style={[{ borderRadius: radius, backgroundColor: tintColor }, style, fallbackStyle]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style, fallbackStyle]} {...rest}>
      {CAN_BLUR && (
        <BlurView tint="light" intensity={strong ? 34 : 26} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} pointerEvents="none" />
      {children}
      {edge}
    </View>
  );
}
