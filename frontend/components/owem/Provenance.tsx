import { View } from 'react-native';
import type { Provenance } from '@/lib/types.ts';
import { space, useColors } from '@/theme';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

/**
 * The state that governs the maths, made visible:
 *   AI_SUGGESTED    — the engine refuses it. Amber: a human still has to look.
 *   USER_CONFIRMED  — a person accepted it.
 *   SYSTEM_COMPUTED — our own arithmetic.
 */
export function ProvenanceBadge({ value }: { value: Provenance }) {
  const c = useColors();
  if (value === 'AI_SUGGESTED') return <Badge label="Needs you" tone="warning" />;
  if (value === 'SYSTEM_COMPUTED') return <Badge label="Worked out" tone="neutral" />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="check" size={12} color={c.positive} strokeWidth={3.2} />
      <Txt variant="caption" style={{ color: c.positiveText }}>Confirmed</Txt>
    </View>
  );
}

export type BannerTone = 'positive' | 'warning' | 'neutral' | 'accent';

/** One line of state, on its soft pill. Never decoration. */
export function Banner({
  tone, text, action, icon,
}: {
  tone: BannerTone;
  text: string;
  action?: React.ReactNode;
  icon?: 'check' | 'alert' | 'info' | 'sparkle' | 'receipt';
}) {
  const c = useColors();
  const map = {
    positive: [c.positiveSoft, c.positiveText, 'check'] as const,
    warning: [c.warningSoft, c.warningText, 'alert'] as const,
    neutral: [c.surfaceAlt, c.inkSecondary, 'info'] as const,
    accent: [c.accentSoft, c.ink, 'sparkle'] as const,
  };
  const [bg, fg, defaultIcon] = map[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[3],
        padding: space[3] + 2,
        paddingHorizontal: space[4],
        backgroundColor: bg,
        borderRadius: 16,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <Icon
          name={icon ?? defaultIcon}
          size={20}
          color={fg}
          strokeWidth={tone === 'positive' ? 2.2 : 1.75}
        />
      </View>
      <Txt variant="footnote" style={{ color: fg, flex: 1 }}>{text}</Txt>
      {action}
    </View>
  );
}
