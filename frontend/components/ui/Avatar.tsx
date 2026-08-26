import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring,
} from 'react-native-reanimated';
import { initials } from '@/lib/format.ts';
import { radius, space, springs, useColors } from '@/theme';
import { Txt } from './Txt';

/**
 * Participants are grey; only the payer is inked. Colour on a person would
 * read as a status, and status is reserved for money.
 */
export function Avatar({
  name, size = 40, payer = false, ring, style,
}: {
  name: string;
  size?: number;
  payer?: boolean;
  /** Surface colour to ring against, for overlapping stacks. */
  ring?: string;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View
      accessibilityLabel={name}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: payer ? c.ink : c.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring ? { borderWidth: 2, borderColor: ring } : null,
        style,
      ]}
    >
      <Txt
        style={{
          fontSize: Math.round(size * 0.4),
          fontWeight: '600',
          color: payer ? c.onInk : c.inkSecondary,
        }}
      >
        {initials(name)}
      </Txt>
    </View>
  );
}

/** Overlapping row: −12px overlap, max 4 visible, then +N. */
export function AvatarStack({
  names, size = 32, max = 3, payerName,
}: {
  names: string[];
  size?: number;
  max?: number;
  payerName?: string;
}) {
  const c = useColors();
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const step = size - 12;
  const width = shown.length * step + (extra > 0 ? step : 0) + 12;

  return (
    <View
      accessibilityLabel={`${names.length} people`}
      style={{ width, height: size, flexDirection: 'row' }}
    >
      {shown.map((n, i) => (
        <Avatar
          key={n + i}
          name={n}
          size={size}
          payer={n === payerName}
          ring={c.surface}
          style={{ position: 'absolute', left: i * step }}
        />
      ))}
      {extra > 0 && (
        <View
          style={{
            position: 'absolute',
            left: shown.length * step,
            width: size,
            height: size,
            borderRadius: radius.full,
            backgroundColor: c.surfaceAlt,
            borderWidth: 2,
            borderColor: c.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt variant="caption" color="inkSecondary">+{extra}</Txt>
        </View>
      )}
    </View>
  );
}

/** Runs once per session. Repeating it on every navigation turns a delight
 *  into a tax. */
let clusterHasAssembled = false;

type Blob = { name: string; size: number; x: number; y: number; ring: number };

/** Two to three concentric rings with organic jitter — a perfect ring reads as
 *  a loading spinner. */
function bloom(names: string[], width: number, height: number): Blob[] {
  const cx = width / 2;
  const cy = height / 2;
  const ringsFor = names.length <= 4 ? 1 : names.length <= 12 ? 2 : 3;
  const out: Blob[] = [];

  names.forEach((name, i) => {
    if (i === 0) {
      out.push({ name, size: 72, x: cx - 36, y: cy - 36, ring: 0 });
      return;
    }
    const idx = i - 1;
    const perRing = Math.ceil((names.length - 1) / ringsFor);
    const ring = Math.min(ringsFor, Math.floor(idx / perRing) + 1);
    const inRing = idx % perRing;
    const count = Math.min(perRing, names.length - 1 - (ring - 1) * perRing);
    // 8–14° of angular offset and ±6px radially, derived from the index so the
    // layout is stable across renders.
    const jitterA = (((i * 37) % 13) - 6) * (Math.PI / 180);
    const jitterR = ((i * 53) % 13) - 6;
    const angle = (inRing / Math.max(1, count)) * Math.PI * 2 + jitterA + ring * 0.7;
    const r = (ring === 1 ? 82 : ring === 2 ? 140 : 190) + jitterR;
    const size = ring === 1 ? 44 + ((i * 7) % 10) : 32 + ((i * 5) % 8);
    out.push({
      name,
      size,
      x: cx + Math.cos(angle) * r - size / 2,
      y: cy + Math.sin(angle) * r - size / 2,
      ring,
    });
  });
  return out;
}

function ClusterBlob({ blob, order, payerName }: { blob: Blob; order: number; payerName?: string }) {
  const scale = useSharedValue(clusterHasAssembled ? 1 : 0.6);
  const opacity = useSharedValue(clusterHasAssembled ? 1 : 0);

  useEffect(() => {
    if (clusterHasAssembled) return;
    // Centre ring outward, 30ms apart.
    scale.value = withDelay(order * 30, withSpring(1, { ...springs.hero, reduceMotion: ReduceMotion.System }));
    opacity.value = withDelay(order * 30, withSpring(1, { ...springs.hero, reduceMotion: ReduceMotion.System }));
  }, [order, scale, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ position: 'absolute', left: blob.x, top: blob.y }, style]}>
      <Avatar name={blob.name} size={blob.size} payer={blob.name === payerName} />
    </Animated.View>
  );
}

export function AvatarCluster({
  names, width, height, payerName,
}: {
  names: string[];
  width: number;
  height: number;
  payerName?: string;
}) {
  const blobs = bloom(names, width, height);
  useEffect(() => {
    const t = setTimeout(() => { clusterHasAssembled = true; }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View
      accessible
      accessibilityLabel={`${names.length} people`}
      style={{ width, height }}
    >
      {blobs
        .map((b, i) => ({ b, i }))
        .sort((a, z) => a.b.ring - z.b.ring)
        .map(({ b, i }, order) => (
          <ClusterBlob key={b.name + i} blob={b} order={order} payerName={payerName} />
        ))}
    </View>
  );
}

export const CLUSTER_GAP = space[6];
