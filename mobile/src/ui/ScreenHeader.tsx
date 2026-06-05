import { type ReactNode } from 'react';
import { type LayoutChangeEvent, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  // Receives the measured header height so the screen can inset its scroll content by it.
  // The header floats out of flow (absolute), so the scroll body reserves this much top
  // padding or its first row would start underneath the header.
  onHeightChange?: (height: number) => void;
  // Inner layout for the bespoke header content: column by default (kicker over title);
  // pass a row style for headers with a trailing control (quick-log counter).
  contentStyle?: StyleProp<ViewStyle>;
};

// The app's screen header. In the liquid-glass redesign the header is NOT a glass bar — it
// floats transparently over the gradient mesh (large title + kicker), the way the design's
// screens do, while content scrolls beneath it. Each screen supplies its kicker/title/
// controls as children and pads its scroll body by the height reported via `onHeightChange`.
export function ScreenHeader({ children, onHeightChange, contentStyle }: Props) {
  return (
    <View
      style={styles.header}
      pointerEvents="box-none"
      onLayout={(e: LayoutChangeEvent) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View style={contentStyle} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 64px top clears the iOS notch/status bar without a safe-area dependency (the design uses
  // paddingTop 64). zIndex keeps it above the scrolling content.
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});
