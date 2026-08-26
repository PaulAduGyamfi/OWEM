import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { radius, useColors } from '@/theme';

export function ProgressBar({ value, tint }: { value: number; tint?: string }) {
  const c = useColors();
  const w = useSharedValue(value);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 320, reduceMotion: ReduceMotion.System });
  }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height: 4, borderRadius: radius.full, backgroundColor: c.border, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 4, borderRadius: radius.full, backgroundColor: tint ?? c.ink }, style]} />
    </View>
  );
}

/** A line the model is still reading. */
export function Skeleton({ width, height = 10 }: { width: number | `${number}%`; height?: number }) {
  const c = useColors();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius.full, backgroundColor: c.surfaceAlt }, style]}
    />
  );
}

export function Spinner({ size = 24, tint }: { size?: number; tint?: string }) {
  const c = useColors();
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear, reduceMotion: ReduceMotion.System }), -1);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          borderWidth: 2.5,
          borderColor: c.border,
          borderTopColor: tint ?? c.ink,
        },
        style,
      ]}
    />
  );
}
