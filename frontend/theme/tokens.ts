/**
 * OWEM design tokens.
 * Colour comes from docs/OWEM Color Palette.md (v4, iOS-leaning, lime accent).
 * Geometry, type and motion come from docs/design-system.md (Orbit).
 *
 * Two rules the palette makes non-negotiable, enforced by how these are named:
 *   1. `accent` is a SURFACE, never a text colour. There is no `accentText`.
 *   2. Status colours only ever mean money direction or state, on their soft pill.
 */

export const palette = {
  light: {
    bg: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceAlt: '#E5E5EA',
    ink: '#000000',
    inkSecondary: '#6D6D72',
    inkTertiary: '#AEAEB2',
    border: '#C6C6C8',
    accent: '#C9F31D',
    accentInk: '#000000',
    accentSoft: '#F4FBD8',
    positive: '#34C759',
    positiveText: '#248A3D',
    positiveSoft: '#E9F8EE',
    negative: '#FF3B30',
    negativeText: '#D70015',
    negativeSoft: '#FFEBE9',
    warning: '#FF9500',
    warningText: '#B25000',
    warningSoft: '#FFF4E5',
    onInk: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.4)',
    glass: 'rgba(255,255,255,0.72)',
    glassBorder: 'rgba(255,255,255,0.7)',
  },
  dark: {
    bg: '#000000',
    surface: '#1C1C1E',
    surfaceAlt: '#2C2C2E',
    ink: '#FFFFFF',
    inkSecondary: '#A1A1A6',
    inkTertiary: '#636366',
    border: '#38383A',
    accent: '#C9F31D',
    accentInk: '#000000',
    accentSoft: '#23290A',
    positive: '#30D158',
    positiveText: '#30D158',
    positiveSoft: '#122A1A',
    negative: '#FF453A',
    negativeText: '#FF453A',
    negativeSoft: '#2E1514',
    warning: '#FF9F0A',
    warningText: '#FF9F0A',
    warningSoft: '#2B2110',
    onInk: '#000000',
    scrim: 'rgba(0,0,0,0.6)',
    glass: 'rgba(44,44,46,0.72)',
    glassBorder: 'rgba(255,255,255,0.16)',
  },
} as const;

export type Colors = typeof palette.light;
export type ColorName = keyof Colors;

/** 4pt base grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999 } as const;

/** Orbit type scale. Negative tracking above 22px only. */
export const type = {
  displayXl: { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -1.3 },
  displayLg: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.56 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.22 },
  title3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 0 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: 0.22 },
} as const;

export type TypeName = keyof typeof type;

/** iOS hairline. The palette asks for 0.5px, not a 1px grey box. */
export const HAIRLINE = 0.5;

/** Minimum tap target, always. */
export const TAP = 44;

export const motion = {
  instant: 120,
  quick: 240,
  sheet: 380,
  hero: 600,
} as const;

/** Reanimated spring matching Orbit's ease-sheet feel. Nothing overshoots. */
export const springs = {
  press: { damping: 30, stiffness: 420, mass: 0.6 },
  sheet: { damping: 34, stiffness: 260, mass: 0.9 },
  hero: { damping: 26, stiffness: 160, mass: 1 },
} as const;
