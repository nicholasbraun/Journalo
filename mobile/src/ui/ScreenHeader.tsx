import { type ReactNode } from 'react';
import { type LayoutChangeEvent, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

import { GlassSurface } from './GlassSurface';
import { theme } from './theme';

type Props = {
  children: ReactNode;
  // Receives the measured header height so the screen can inset its scroll content by it.
  // The header floats out of flow (see below), so the scroll body must reserve this much
  // top padding or its first row would start underneath the header.
  onHeightChange?: (height: number) => void;
  // Inner layout for the bespoke header content: column by default (kicker over title);
  // pass a row style for headers with a trailing control (quick-log counter, new-topic
  // cancel/create buttons).
  contentStyle?: StyleProp<ViewStyle>;
};

// The app's screen header, rendered as native Liquid Glass on iOS 26+ and solid paper
// otherwise. It floats above the scroll content (absolute, full-bleed) precisely so that
// content passes *under* it — which is the only arrangement in which the glass material
// has anything to refract. Each screen supplies its own kicker/title/controls as children
// and pads its scroll body by the height reported through `onHeightChange`.
//
// Square corners (radius 0): this surface meets the screen's top and side edges, so unlike
// the floating capsule chrome it stays square, consistent with the brutalist paper look.
export function ScreenHeader({ children, onHeightChange, contentStyle }: Props) {
  return (
    <GlassSurface
      radius={0}
      style={styles.header}
      onLayout={(e: LayoutChangeEvent) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  // 56px top clears the iOS notch/status bar without a safe-area dependency (matches the
  // original per-screen headers). zIndex keeps the glass above the scrolling content.
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.rule,
  },
  content: {},
});
