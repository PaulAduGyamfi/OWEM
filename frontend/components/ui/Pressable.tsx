import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, ReduceMotion,
} from 'react-native-reanimated';
import { motion } from '@/theme';
import * as haptics from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Press({
  children, onPress, onLongPress, disabled, style, hitSlop = 6, haptic = 'tap', label,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  haptic?: 'tap' | 'select' | 'commit' | 'warn' | 'none';
  label?: string;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: motion.instant, reduceMotion: ReduceMotion.System });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.instant, reduceMotion: ReduceMotion.System });
      }}
      onPress={() => {
        if (haptic !== 'none') haptics[haptic]();
        onPress?.();
      }}
      onLongPress={onLongPress && (() => {
        haptics.commit();
        onLongPress();
      })}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
