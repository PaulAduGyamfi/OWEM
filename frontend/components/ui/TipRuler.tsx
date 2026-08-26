import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { Cents } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';

const TICKS = 29;

/**
 * A tick ruler above the figure: hairlines, every fifth taller, the centre tick
 * inked to mark the current value. Drag to adjust; tap the figure to type one.
 */
export function TipRuler({
  subtotal, onAdjust,
}: {
  subtotal: Cents;
  /**
   * Reports a DELTA in percentage points, not a value. The pan fires many times
   * per JS tick, so the parent must fold each one into the latest state itself —
   * computing a new total from a value captured in this render would drop every
   * frame but the last.
   */
  onAdjust: (deltaPercentPoints: number) => void;
}) {
  const c = useColors();

  // ~6px of travel per percentage point, so a full drag covers roughly 0–40%.
  const report = (dx: number) => onAdjust(dx / 6);

  const drag = Gesture.Pan().onChange((e) => {
    runOnJS(report)(e.changeX);
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
