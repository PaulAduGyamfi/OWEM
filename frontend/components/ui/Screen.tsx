import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useColors } from '@/theme';

/** Screen gutter is 16. Scroll containers clear the floating dock by 96. */
export const GUTTER = space[4];

export function Screen({
  children, scroll = false, bg, style, bottomPad = 0,
}: {
  children: ReactNode;
  scroll?: boolean;
  bg?: string;
  style?: ViewStyle;
  /** Extra room under the content for a floating bar or dock. */
  bottomPad?: number;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const background = bg ?? c.bg;

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: background, paddingTop: insets.top }, style]}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={[
        { paddingTop: insets.top, paddingBottom: insets.bottom + bottomPad + space[6] },
        style,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
