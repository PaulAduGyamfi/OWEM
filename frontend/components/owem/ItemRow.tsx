import { View } from 'react-native';
import { formatMoney } from '@/lib/money.ts';
import type { ReceiptItem } from '@/lib/types.ts';
import { CONFIDENCE_FLOOR } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Row } from '@/components/ui/Card';
import { Txt } from '@/components/ui/Txt';
import { ProvenanceBadge } from './Provenance';

export function ItemRow({ item, onPress }: { item: ReceiptItem; onPress?: () => void }) {
  const c = useColors();
  const lowConfidence = item.confidence !== null && item.confidence < CONFIDENCE_FLOOR;
  const needsYou = item.provenance === 'AI_SUGGESTED';

  return (
    <Row height={72} onPress={onPress}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          backgroundColor: needsYou ? c.warningSoft : c.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Txt variant="footnote" tnum style={{ fontWeight: '600', color: needsYou ? c.warningText : c.inkSecondary }}>
          ×{item.quantity}
        </Txt>
      </View>

      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{item.normalizedName}</Txt>
        <Txt variant="footnote" color="inkSecondary" style={{ fontFamily: MONO }}>
          {item.rawName}
          {lowConfidence && item.confidence !== null
            ? ` · ${Math.round(item.confidence * 100)}% sure`
            : ''}
        </Txt>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Txt variant="callout" tnum>{formatMoney(item.totalPrice)}</Txt>
        <ProvenanceBadge value={item.provenance} />
      </View>
    </Row>
  );
}

export const MONO = 'Menlo';
