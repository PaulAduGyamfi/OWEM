import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { HAIRLINE, radius, space, useColors } from '@/theme';
import { Press } from './Pressable';

export function Card({
  children, style, padded = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.lg,
          borderWidth: HAIRLINE,
          borderColor: c.border,
          overflow: 'hidden',
        },
        padded && { padding: space[4] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Separator({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return <View style={{ height: HAIRLINE, backgroundColor: c.border, marginLeft: inset }} />;
}

export function Row({
  children, height = 56, onPress, onLongPress, style, tint,
}: {
  children: ReactNode;
  height?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  const body = (
    <View
      style={[
        {
          minHeight: height,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          paddingHorizontal: space[4],
          backgroundColor: tint,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} onLongPress={onLongPress}>{body}</Press>
  ) : (
    body
  );
}

export function Grouped({
  children, inset = space[4], style,
}: {
  children: ReactNode | ReactNode[];
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <Card style={style}>
      {rows.map((child, i) => (
        <View key={i}>
          {i > 0 && <Separator inset={inset} />}
          {child}
        </View>
      ))}
    </Card>
  );
}
