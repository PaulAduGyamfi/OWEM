import { useState } from 'react';
import { Linking, View } from 'react-native';
import { formatAmount, formatMoney } from '@/lib/money.ts';
import { PAYMENT_METHOD_LABEL, type Cents, type Participant, type PaymentMethod } from '@/lib/types.ts';
import { space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { Txt } from '@/components/ui/Txt';
import { DEEP_LINK, RailPicker } from '@/components/owem/RailPicker';

export function RequestSheet({
  participant, amount, eventTitle, open, onClose, onSeeBreakdown,
}: {
  participant: Participant | null;
  amount: Cents;
  eventTitle: string;
  open: boolean;
  onClose: () => void;
  onSeeBreakdown: () => void;
}) {
  const c = useColors();
  const [rail, setRail] = useState<PaymentMethod>('venmo');
  if (!participant) return null;

  const note = `${eventTitle} — your share`;
  const link = DEEP_LINK[rail];

  return (
    <Sheet open={open} onClose={onClose} title={`Ask ${participant.displayName}`} detent="large">
      <View style={{ flex: 1, gap: space[4] }}>
        <Grouped inset={space[4]}>
          <Row height={48}>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>For</Txt>
            <Txt variant="callout">{eventTitle}</Txt>
          </Row>
          <Row height={48}>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>Note</Txt>
            <Txt variant="callout" numberOfLines={1}>{note}</Txt>
          </Row>
        </Grouped>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Txt variant="footnote" color="inkSecondary">Amount</Txt>
            <Txt variant="displayXl" tnum>{formatMoney(amount)}</Txt>
          </View>
          <Press onPress={onSeeBreakdown} style={{ paddingBottom: space[2] }}>
            <Txt variant="callout" style={{ fontWeight: '600' }}>See the breakdown</Txt>
          </Press>
        </View>

        <View style={{ gap: space[3] }}>
          <Txt variant="caption" color="inkSecondary">SEND THE REQUEST THROUGH</Txt>
          <RailPicker value={rail} onChange={setRail} />
        </View>

        <View style={{ flex: 1 }} />

        <Button
          label={rail === 'cash' ? 'Ask them in person' : `Open ${PAYMENT_METHOD_LABEL[rail]}`}
          icon={rail === 'cash' ? undefined : 'openOut'}
          onPress={() => {
            if (link) Linking.openURL(link(formatAmount(amount), note)).catch(() => {});
            onClose();
          }}
        />
        <Txt variant="footnote" color="inkSecondary">
          {rail === 'cash'
            ? "Cash leaves no trail, so you'll record it here once it's in your hand."
            : `${PAYMENT_METHOD_LABEL[rail]} opens with the amount and note already filled in. OWEM doesn't move the money and doesn't watch your bank — you'll say when it lands.`}
        </Txt>
      </View>
    </Sheet>
  );
}
