import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { cents } from '@/lib/money.ts';
import type { Cents } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';

const TICKS = 29;

/**
 * A tick ruler above the figure: hairlines, every fifth taller, the centre tick
 * inked to mark the current value. Drag to adjust; tap the figure to type one.
 */
export function TipRuler({
  subtotal, value, onChange,
}: {
  subtotal: Cents;
  value: Cents;
  onChange: (v: Cents) => void;
}) {
  const c = useColors();

  // 4px of travel per cent of the subtotal, so a full drag covers ~0–40%.
  const commit = (dx: number) => {
    const deltaPercent = dx / 6;
    const percent = (value / Math.max(1, subtotal)) * 100 + deltaPercent;
    const clamped = Math.max(0, Math.min(40, percent));
    onChange(cents(Math.round((subtotal * clamped) / 100)));
  };

  const drag = Gesture.Pan().onChange((e) => {
    runOnJS(commit)(e.changeX);
  });

  return (
    <GestureDetector gesture={drag}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Tip amount"
        style={{
          height: 44,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: space[4],
        }}
      >
        {Array.from({ length: TICKS }, (_, i) => {
          const centre = i === (TICKS - 1) / 2;
          const major = i % 5 === 0;
          return (
            <View
              key={i}
              style={{
                width: centre ? 2.5 : 2,
                height: centre ? 32 : major ? 22 : 12,
                borderRadius: radius.sm / 4,
                backgroundColor: centre ? c.ink : major ? c.inkTertiary : c.border,
              }}
            />
          );
        })}
      </View>
    </GestureDetector>
  );
}
