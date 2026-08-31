import { useEffect } from 'react';
import { useAnimatedProps, useSharedValue, withTiming, ReduceMotion } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Platform, TextInput } from 'react-native';
import { formatMoney } from '@/lib/money.ts';
import type { Cents } from '@/lib/types.ts';
import { motion, type, useColors, type ColorName, type TypeName } from '@/theme';
import { Txt } from './Txt';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

export function Money({
  value, variant = 'callout', color = 'ink', sign, style,
}: {
  value: Cents;
  variant?: TypeName;
  color?: ColorName;
  sign?: boolean;
  style?: object;
}) {
  return (
    <Txt tnum variant={variant} color={color} style={style}>
      {formatMoney(value, { sign })}
    </Txt>
  );
}

export function CountingMoney({
  value, variant = 'displayXl', color = 'ink',
}: {
  value: Cents;
  variant?: TypeName;
  color?: ColorName;
}) {
  const c = useColors();
  const isWeb = Platform.OS === 'web';
  const shown = useSharedValue(value as number);

  useEffect(() => {
    shown.value = withTiming(value as number, {
      duration: motion.quick * 2,
      reduceMotion: ReduceMotion.System,
    });
  }, [value, shown]);

  const props = useAnimatedProps(() => {
    const v = Math.round(shown.value);
    const neg = v < 0;
    const abs = Math.abs(v);
    const whole = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    return { text: `${neg ? '−' : ''}$${whole}.${frac}`, defaultValue: '' } as never;
  });

  if (isWeb) return <Money value={value} variant={variant} color={color} />;

  return (
    <AnimatedInput
      editable={false}
      accessibilityLabel={formatMoney(value)}
      animatedProps={props}
      style={[
        type[variant],
        {
          color: c[color],
          fontVariant: ['tabular-nums'],
          padding: 0,
          margin: 0,
          includeFontPadding: false,
        },
      ]}
    />
  );
}
