import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import * as haptics from '@/lib/haptics.ts';
import { motion, radius, springs, useColors } from '@/theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

const TRACK_HEIGHT = 56;
const THUMB = 48;
const PAD = 4;

export function SlideToConfirm({
  label, doneLabel = 'Done', onConfirm, width, disabled = false,
}: {
  label: string;
  doneLabel?: string;
  onConfirm: () => void;
  width: number;
  disabled?: boolean;
}) {
  const c = useColors();
  const [done, setDone] = useState(false);
  const travel = width - THUMB - PAD * 2;
  const x = useSharedValue(0);

  const finish = () => {
    if (disabled) return;
    haptics.commit();
    setDone(true);
    setTimeout(onConfirm, 800);
  };

  const drag = Gesture.Pan()
    .enabled(!done && !disabled)
    .onChange((e) => {
      x.value = Math.min(travel, Math.max(0, x.value + e.changeX));
    })
    .onEnd(() => {
      if (x.value > travel * 0.85) {
        x.value = withTiming(travel, { duration: motion.instant, reduceMotion: ReduceMotion.System });
        runOnJS(finish)();
      } else {
        x.value = withSpring(0, { ...springs.press, reduceMotion: ReduceMotion.System });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - x.value / Math.max(1, travel) }));

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Double tap to confirm, or slide the control"
      accessibilityState={{ disabled }}
      onAccessibilityTap={finish}
      style={{
        width,
        height: TRACK_HEIGHT,
        borderRadius: radius.full,
        backgroundColor: done ? c.positive : disabled ? c.surfaceAlt : c.accent,
        padding: PAD,
        justifyContent: 'center',
      }}
    >
      {done ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="check" size={22} color={c.surface} strokeWidth={2.4} />
          <Txt variant="bodyStrong" style={{ color: c.surface }}>{doneLabel}</Txt>
        </View>
      ) : (
        <>
          <Animated.View
            style={[
              { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
              labelStyle,
            ]}
          >
            <Txt variant="bodyStrong" style={{ color: disabled ? c.inkTertiary : c.accentInk }}>
              {label}
            </Txt>
          </Animated.View>
          <GestureDetector gesture={drag}>
            <Animated.View
              style={[
                {
                  width: THUMB,
                  height: THUMB,
                  borderRadius: radius.full,
                  backgroundColor: disabled ? c.border : c.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                },
                thumbStyle,
              ]}
            >
              <Icon name="arrowRight" size={22} color={disabled ? c.inkTertiary : c.ink} strokeWidth={2} />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </View>
  );
}
