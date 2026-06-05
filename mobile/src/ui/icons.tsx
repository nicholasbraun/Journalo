import Svg, { Path } from 'react-native-svg';

import { theme } from './theme';

// Clean line icons for in-content controls (the Today "+" capsule, the New Topic sheet's
// close/create buttons, the Year stepper + disclosure chevrons). Transcribed verbatim from
// the design handoff's `components.jsx`. The bottom-tab icons are deliberately NOT here —
// those stay native SF Symbols on the NativeTabs bar.

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function IconPlus({ size = 22, color = theme.ink, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconClose({ size = 18, color = theme.ink, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCheck({ size = 18, color = theme.ink, strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ChevronProps = IconProps & { dir?: 'right' | 'left' | 'down' };

export function Chevron({ dir = 'right', size = 17, color = theme.ink, strokeWidth = 2.4 }: ChevronProps) {
  const d = { right: 'M8 4l7 8-7 8', left: 'M16 4l-7 8 7 8', down: 'M4 8l8 7 8-7' }[dir];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
