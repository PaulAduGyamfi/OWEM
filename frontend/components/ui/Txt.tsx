import { Text, type TextProps, type TextStyle } from 'react-native';
import { type ColorName, type TypeName, type, useColors } from '@/theme';

type Props = TextProps & {
  variant?: TypeName;
  color?: ColorName;
  tnum?: boolean;
  center?: boolean;
};

export function Txt({
  variant = 'body', color = 'ink', tnum, center, style, ...rest
}: Props) {
  const c = useColors();
  const base = type[variant] as TextStyle;
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: c[color] },
        tnum && { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

export function Amount({
  variant = 'displayLg', ...rest
}: Omit<Props, 'tnum'>) {
  return <Txt tnum variant={variant} {...rest} />;
}
