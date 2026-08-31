import { View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { Icon } from './Icon';
import { Press } from './Pressable';
import { Txt } from './Txt';

export function Stepper({
  value, onChange, min = 1, max = 12,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const c = useColors();
  const btn = (name: 'minus' | 'plus', to: number, enabled: boolean) => (
    <Press
      onPress={() => enabled && onChange(to)}
      haptic="select"
      style={{
        width: 28, height: 28, borderRadius: radius.full,
        backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
        opacity: enabled ? 1 : 0.4,
      }}
    >
      <Icon name={name} size={14} color={c.inkSecondary} strokeWidth={2.4} />
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 }}>
      {btn('minus', value - 1, value > min)}
      <Txt variant="callout" tnum style={{ minWidth: 16, textAlign: 'center', fontWeight: '600' }}>
        {value}
      </Txt>
      {btn('plus', value + 1, value < max)}
    </View>
  );
}
