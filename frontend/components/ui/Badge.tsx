import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { Press } from './Pressable';
import { Txt } from './Txt';

export type Tone = 'neutral' | 'positive' | 'warning' | 'negative' | 'accent' | 'ink';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: ReactNode }) {
  const c = useColors();
  const map: Record<Tone, [string, string]> = {
    neutral: [c.surfaceAlt, c.inkSecondary],
    positive: [c.positiveSoft, c.positiveText],
    warning: [c.warningSoft, c.warningText],
    negative: [c.negativeSoft, c.negativeText],
    accent: [c.accentSoft, c.ink],
    ink: [c.ink, c.onInk],
  };
  const [bg, fg] = map[tone];
  return (
    <View
      style={{
        height: 24,
        paddingHorizontal: space[2] + 2,
        borderRadius: radius.full,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icon}
      <Txt variant="caption" style={{ color: fg }}>{label}</Txt>
    </View>
  );
}

export function Chip({
  label, selected, onPress, icon, style, flex,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
  flex?: boolean;
}) {
  const c = useColors();
  return (
    <Press
      onPress={onPress}
      haptic="select"
      style={[
        {
          height: 36,
          paddingHorizontal: space[3] + 2,
          borderRadius: radius.full,
          backgroundColor: selected ? c.ink : c.surfaceAlt,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space[2] - 2,
        },
        flex && { flex: 1 },
        style,
      ]}
    >
      {icon}
      <Txt variant="callout" style={{ color: selected ? c.onInk : c.ink }}>{label}</Txt>
    </Press>
  );
}
