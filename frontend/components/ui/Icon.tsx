import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '@/theme';

/** Rounded outline, 1.75px stroke on a 24px canvas. Filled variants only for
 *  an active navigation state. */
export type IconName =
  | 'back' | 'forward' | 'down' | 'plus' | 'minus' | 'check' | 'close'
  | 'bell' | 'camera' | 'home' | 'people' | 'person' | 'receipt'
  | 'alert' | 'info' | 'arrowRight' | 'edit' | 'refresh' | 'photo'
  | 'list' | 'more' | 'openOut' | 'cash' | 'backspace' | 'sparkle' | 'clock';

const PATHS: Record<IconName, string[]> = {
  back: ['M15 6l-6 6 6 6'],
  forward: ['M9 6l6 6-6 6'],
  down: ['M6 9l6 6 6-6'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  close: ['M6 6l12 12M18 6L6 18'],
  bell: ['M18 8.5a6 6 0 10-12 0c0 6.5-2.5 7.5-2.5 7.5h17S18 15 18 8.5', 'M13.7 19.5a2 2 0 01-3.4 0'],
  camera: ['M3 8.5A2.5 2.5 0 015.5 6h1.6l1.2-2h7.4l1.2 2h1.6A2.5 2.5 0 0121 8.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5z'],
  home: ['M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19z'],
  people: ['M3.5 19.5c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6', 'M16.5 5.4a3.2 3.2 0 010 5.2', 'M18 15.4c2 .6 3.2 2.1 3.6 4.1'],
  person: ['M5 20c.7-3.6 3.4-5.5 7-5.5s6.3 1.9 7 5.5'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8.5h6M9 12.5h6'],
  alert: ['M12 7.5v5.5M12 16.6v.01'],
  info: ['M12 16.5V11M12 7.9v.01'],
  arrowRight: ['M5 12h13M13 6l6 6-6 6'],
  edit: ['M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17z'],
  refresh: ['M4 12a8 8 0 0113.7-5.6L20 8', 'M20 4v4h-4', 'M20 12a8 8 0 01-13.7 5.6L4 16', 'M4 20v-4h4'],
  photo: ['M4 16l4.5-4.5 4 4L16 12l4 4'],
  list: ['M4 6h16M4 12h16M4 18h10'],
  more: [],
  openOut: ['M14 5h5v5', 'M19 5l-8 8', 'M18.5 14v4.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V7A1.5 1.5 0 016 5.5h4.5'],
  cash: [],
  backspace: ['M9 5h9a2 2 0 012 2v10a2 2 0 01-2 2H9L3 12z', 'M13 10l4 4M17 10l-4 4'],
  sparkle: ['M12 4l1.7 4.6L18.5 10l-4.8 1.4L12 16l-1.7-4.6L5.5 10l4.8-1.4z'],
  clock: ['M12 7.5V12l3 1.8'],
};

const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }[]>> = {
  camera: [{ cx: 12, cy: 13, r: 3.4 }],
  people: [{ cx: 9, cy: 8, r: 3.2 }],
  person: [{ cx: 12, cy: 8, r: 3.5 }],
  alert: [{ cx: 12, cy: 12, r: 9 }],
  info: [{ cx: 12, cy: 12, r: 9 }],
  clock: [{ cx: 12, cy: 12, r: 9 }],
  cash: [{ cx: 12, cy: 12, r: 2.6 }],
  more: [
    { cx: 12, cy: 5.5, r: 1.4 },
    { cx: 12, cy: 12, r: 1.4 },
    { cx: 12, cy: 18.5, r: 1.4 },
  ],
};

export function Icon({
  name, size = 24, color, strokeWidth = 1.75, filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}) {
  const c = useColors();
  const stroke = color ?? c.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'cash' && (
        <Rect x={2.5} y={6} width={19} height={12} rx={2.5} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={stroke}
          fill={filled && i === 0 ? stroke : 'none'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {(CIRCLES[name] ?? []).map((circle, i) => (
        <Circle
          key={`c${i}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          stroke={stroke}
          fill={name === 'more' ? stroke : 'none'}
          strokeWidth={strokeWidth}
        />
      ))}
    </Svg>
  );
}
