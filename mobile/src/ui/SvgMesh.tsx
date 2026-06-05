import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

// The Apple-style gradient-mesh background that the whole app floats over — the surface the
// glass refracts. Transcribed from the design's `glass.css` `.app[data-mood="mist"]` mood
// (cool lavender / sky / lilac / mint over a near-white linear underlay).
//
// Each CSS `radial-gradient(W% H% at X% Y%, color, transparent N%)` maps directly to a
// react-native-svg <RadialGradient> in objectBoundingBox units: cx/cy = the X%/Y% center,
// rx/ry = the W%/H% radii, and the `transparent N%` becomes a Stop fading stopOpacity to 0
// at offset N. CSS paints the first-listed gradient on top, so the rects are stacked
// back-to-front: the linear underlay first, then the radial layers in reverse listing order
// so the top-left lavender ends up on top.
//
// The mesh sits at the very back (zIndex 0); screens render transparently above it.
export function SvgMesh() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="mesh-base" x1="0" y1="0" x2="0.36" y2="1">
          <Stop offset="0" stopColor="#eef2fb" />
          <Stop offset="0.5" stopColor="#f3f1fb" />
          <Stop offset="1" stopColor="#eef6f8" />
        </LinearGradient>
        {/* mint, bottom-left */}
        <RadialGradient id="mesh-4" cx="0.08" cy="0.92" rx="0.5" ry="0.42" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="rgb(150,240,205)" stopOpacity="0.42" />
          <Stop offset="0.72" stopColor="rgb(150,240,205)" stopOpacity="0" />
        </RadialGradient>
        {/* lilac, bottom-right */}
        <RadialGradient id="mesh-3" cx="0.84" cy="0.96" rx="0.55" ry="0.45" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="rgb(190,168,255)" stopOpacity="0.45" />
          <Stop offset="0.72" stopColor="rgb(190,168,255)" stopOpacity="0" />
        </RadialGradient>
        {/* sky, top-right */}
        <RadialGradient id="mesh-2" cx="0.92" cy="0.14" rx="0.46" ry="0.4" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="rgb(120,214,245)" stopOpacity="0.5" />
          <Stop offset="0.72" stopColor="rgb(120,214,245)" stopOpacity="0" />
        </RadialGradient>
        {/* lavender, top-left (drawn last = on top) */}
        <RadialGradient id="mesh-1" cx="0.14" cy="0.08" rx="0.48" ry="0.38" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="rgb(150,168,255)" stopOpacity="0.55" />
          <Stop offset="0.7" stopColor="rgb(150,168,255)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-base)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-4)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-3)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-2)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mesh-1)" />
    </Svg>
  );
}
