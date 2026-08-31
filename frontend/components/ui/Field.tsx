import { useState } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { HAIRLINE, radius, space, useColors, type } from '@/theme';
import { Txt } from './Txt';

export function Field({
  label, value, onChangeText, placeholder, error, keyboardType, autoFocus, right, onSubmitEditing,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  right?: React.ReactNode;
  onSubmitEditing?: () => void;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      {label && <Txt variant="caption" color="inkSecondary">{label.toUpperCase()}</Txt>}
      <View
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          backgroundColor: focused ? c.surface : c.surfaceAlt,
          borderWidth: focused || error ? 1.5 : 0,
          borderColor: error ? c.negative : c.ink,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: space[3] + 2,
          paddingRight: right ? space[1] + 2 : space[3] + 2,
          gap: space[2],
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.inkTertiary}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="done"
          selectionColor={c.ink}
          style={[type.body, { flex: 1, color: c.ink, paddingVertical: space[3] }]}
        />
        {right}
      </View>
      {error && <Txt variant="footnote" color="negativeText">{error}</Txt>}
    </View>
  );
}

export { HAIRLINE };
