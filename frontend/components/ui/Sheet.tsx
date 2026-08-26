import { type ReactNode, useEffect } from 'react';
import { Modal, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, radius, space, springs, useColors } from '@/theme';
import { Icon } from './Icon';
import { Press } from './Pressable';
import { Txt } from './Txt';

/**
 * Consequential moments arrive as a sheet on a dimmed parent, never a full
 * screen route change — so the user never loses their place.
 * Never full height: the parent stays partly visible.
 */
export function Sheet({
  open, onClose, title, subtitle, children, detent = 'medium',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  detent?: 'medium' | 'large';
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * (detent === 'large' ? 0.86 : 0.7), height - 96);

  const y = useSharedValue(sheetHeight);
  const scrim = useSharedValue(0);

  useEffect(() => {
    if (open) {
      y.value = withSpring(0, { ...springs.sheet, reduceMotion: ReduceMotion.System });
      scrim.value = withTiming(1, { duration: motion.sheet, reduceMotion: ReduceMotion.System });
    } else {
      y.value = sheetHeight;
      scrim.value = 0;
    }
  }, [open, sheetHeight, y, scrim]);

  const dismiss = () => {
    y.value = withTiming(sheetHeight, { duration: motion.quick, reduceMotion: ReduceMotion.System });
    scrim.value = withTiming(0, { duration: motion.quick, reduceMotion: ReduceMotion.System }, () => {
      runOnJS(onClose)();
    });
  };

  const drag = Gesture.Pan()
    .onChange((e) => {
      y.value = Math.max(0, y.value + e.changeY);
    })
    .onEnd((e) => {
      if (y.value > sheetHeight * 0.3 || e.velocityY > 900) {
        y.value = withTiming(sheetHeight, { duration: motion.quick, reduceMotion: ReduceMotion.System });
        scrim.value = withTiming(0, { duration: motion.quick, reduceMotion: ReduceMotion.System }, () => {
          runOnJS(onClose)();
        });
      } else {
        y.value = withSpring(0, { ...springs.sheet, reduceMotion: ReduceMotion.System });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ ...StyleSheetAbsolute, backgroundColor: c.scrim }, scrimStyle]}>
          <Press onPress={dismiss} haptic="none" style={{ flex: 1 }}><View style={{ flex: 1 }} /></Press>
        </Animated.View>

        <Animated.View
          style={[
            {
              height: sheetHeight,
              backgroundColor: c.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              paddingBottom: insets.bottom + space[4],
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 40,
              shadowOffset: { width: 0, height: -8 },
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={drag}>
            <View style={{ paddingTop: space[2], paddingBottom: space[1] }}>
              <View
                style={{
                  width: 36, height: 4, borderRadius: radius.full,
                  backgroundColor: c.border, alignSelf: 'center',
                }}
              />
            </View>
          </GestureDetector>

          <View
            style={{
              paddingHorizontal: space[5],
              paddingTop: space[3],
              paddingBottom: space[4],
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: space[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="title2">{title}</Txt>
              {subtitle && <Txt variant="footnote" color="inkSecondary" tnum style={{ marginTop: 4 }}>{subtitle}</Txt>}
            </View>
            <Press
              onPress={dismiss}
              style={{
                width: 32, height: 32, borderRadius: radius.full,
                backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="close" size={16} color={c.inkSecondary} strokeWidth={2} />
            </Press>
          </View>

          <View style={{ flex: 1, paddingHorizontal: space[5] }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
