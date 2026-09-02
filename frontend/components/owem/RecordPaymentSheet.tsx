import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatAmount, formatMoney, parseAmount } from '@/lib/money.ts';
import type { Cents, Participant, PaymentMethod } from '@/lib/types.ts';
import { space } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Grouped, Row } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { SlideToConfirm } from '@/components/ui/SlideToConfirm';
import { Txt } from '@/components/ui/Txt';
import { RailPicker } from '@/components/owem/RailPicker';

export function RecordPaymentSheet({
  participant, owed, open, onClose, onRecord, width,
}: {
  participant: Participant | null;
  owed: Cents;
  open: boolean;
  onClose: () => void;
  onRecord: (amount: Cents, method: PaymentMethod) => void;
  width: number;
}) {
  const [method, setMethod] = useState<PaymentMethod>('venmo');
  const [amount, setAmount] = useState('');
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    setAmount(formatAmount(owed));
    setPartial(false);
  }, [owed, participant]);

  if (!participant) return null;
  const parsed = parseAmount(amount);
  const valid = parsed !== null && parsed > 0;
  const remaining = valid ? Math.max(0, owed - parsed) : owed;

  return (
    <Sheet open={open} onClose={onClose} title="Record a payment" detent="large">
      <View style={{ flex: 1, gap: space[4] }}>
        <Grouped inset={space[4]}>
          <Row height={56}>
            <Txt variant="callout" color="inkSecondary" style={{ flex: 1 }}>From</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Avatar name={participant.displayName} size={28} />
              <Txt variant="callout" style={{ fontWeight: '600' }}>{participant.displayName}</Txt>
            </View>
          </Row>
        </Grouped>

        {partial ? (
          <Field
            label="Amount received"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
            error={valid ? null : 'Enter an amount like 20.00, greater than zero.'}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Txt variant="footnote" color="inkSecondary">Amount received</Txt>
              <Txt variant="displayXl" tnum>{formatMoney(owed)}</Txt>
            </View>
            <Press onPress={() => setPartial(true)} style={{ paddingBottom: space[2] }}>
              <Txt variant="callout" color="inkSecondary" style={{ fontWeight: '600' }}>Part of it</Txt>
            </Press>
          </View>
        )}

        <View style={{ gap: space[3] }}>
          <Txt variant="caption" color="inkSecondary">THROUGH</Txt>
          <RailPicker value={method} onChange={setMethod} />
        </View>

        <View style={{ flex: 1 }} />

        <SlideToConfirm
          label={valid ? 'Slide to record' : 'Enter an amount first'}
          doneLabel="Recorded"
          width={width}
          disabled={!valid}
          onConfirm={() => {
            if (!valid || parsed === null) return;
            onRecord(parsed, method);
          }}
        />
        <Txt variant="footnote" color="inkSecondary" center>
          {remaining > 0
            ? `${participant.displayName} would still owe ${formatMoney(remaining as Cents)}.`
            : `This drops what ${participant.displayName} owes to $0.00.`}
          {' '}Nobody else can do this — not the model, not {participant.displayName}.
        </Txt>
      </View>
    </Sheet>
  );
}
