import { ActivityIndicator, View } from 'react-native';
import { radius, space, useColors, HAIRLINE } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Press } from './Pressable';
import { Txt } from './Txt';

/**
 * One lime per screen — that is the `primary` variant, and it belongs to the
 * single action the user came to take. Everything else is ink or quieter.
 * When the action is not available it goes grey; it never sits there in lime.
 */
export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'tertiary' | 'ghost';

export function Button({
  label, onPress, variant = 'primary', disabled, loading, icon, iconLeft, size = 'large', style, flex,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconLeft?: IconName;
  size?: 'large' | 'standard' | 'compact';
  style?: object;
  flex?: boolean;
}) {
  const c = useColors();
  const height = size === 'large' ? 56 : size === 'standard' ? 48 : 36;
  const paddingHorizontal = size === 'large' ? space[6] : size === 'standard' ? space[5] : space[4];

  const fill =
    disabled ? c.surfaceAlt
    : variant === 'primary' ? c.accent
    : variant === 'ink' ? c.ink
    : variant === 'secondary' ? c.surfaceAlt
    : 'transparent';

  const label_ =
    disabled ? c.inkTertiary
    : variant === 'primary' ? c.accentInk
    : variant === 'ink' ? c.onInk
    : c.ink;

  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === 'primary' ? 'select' : 'tap'}
      style={[
        {
          height,
          paddingHorizontal,
          borderRadius: radius.full,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space[2],
        },
        variant === 'tertiary' && { borderWidth: HAIRLINE, borderColor: c.border },
        flex && { flex: 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={label_} />
      ) : (
        <>
          {iconLeft && <Icon name={iconLeft} size={20} color={label_} />}
          <Txt variant="bodyStrong" style={{ color: label_ }}>{label}</Txt>
          {icon && <Icon name={icon} size={20} color={label_} />}
        </>
      )}
    </Press>
  );
}

/** A row of buttons where only the last one may be lime. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space[3] }}>{children}</View>;
}
