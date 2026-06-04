import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';

import { theme } from './theme';

// Whether real Liquid Glass can render: iOS 26+ only. `false` on older iOS and on
// Android (where GlassView would itself fall back to a plain View). The OS version
// cannot change while the app runs, so resolve it once at module load rather than on
// every render.
const GLASS = isLiquidGlassAvailable();

type Props = ViewProps & {
  // Corner radius of the surface. Floating chrome (the year toolbar, the + button) rounds
  // its corners because Liquid Glass reads as a soft capsule; full-bleed headers pass 0 to
  // keep the square edge where the surface meets the screen. The solid fallback rounds
  // identically, so both paths share one silhouette.
  radius?: number;
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  isInteractive?: boolean;
  children?: ReactNode;
};

// A chrome surface that is native Liquid Glass on iOS 26+ and a solid `paper` panel
// everywhere else. This is the SINGLE place the iOS-26-vs-fallback split lives: screens
// compose `GlassSurface` and never import `expo-glass-effect` directly, so the chosen
// fallback rule (solid paper, deliberately no blur) stays in one file.
//
// Why solid paper rather than a frosted blur off iOS 26: a floating header backed by
// opaque paper simply hides the content scrolling beneath it, which is exactly the app's
// pre-glass pinned-header look — one coherent non-glass appearance on Android and older
// iOS, with no extra dependency.
export function GlassSurface({
  radius = 0,
  glassEffectStyle = 'regular',
  tintColor,
  isInteractive,
  style,
  children,
  ...rest
}: Props) {
  if (GLASS) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        // Light mode is pinned app-wide (app.json `userInterfaceStyle: "light"`), so force
        // the light glass material instead of tracking the system appearance.
        colorScheme="light"
        style={[{ borderRadius: radius }, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ backgroundColor: theme.paper, borderRadius: radius }, style]} {...rest}>
      {children}
    </View>
  );
}
