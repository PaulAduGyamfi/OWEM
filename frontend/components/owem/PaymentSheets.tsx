import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { formatAmount, formatMoney, parseAmount } from '@/lib/money.ts';
import { PAYMENT_METHOD_LABEL, type Cents, type Participant, type PaymentMethod } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Press } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { SlideToConfirm } from '@/components/ui/SlideToConfirm';
import { Txt } from '@/components/ui/Txt';

const RAILS: PaymentMethod[] = ['venmo', 'cashapp', 'zelle', 'applecash', 'cash'];

const DEEP_LINK: Record<PaymentMethod, ((amount: string, note: string) => string) | null> = {
  venmo: (a, n) => `venmo://paycharge?txn=charge&amount=${a}&note=${encodeURIComponent(n)}`,
  cashapp: (a) => `https://cash.app/$/${a}`,
  zelle: () => 'https://www.zellepay.com/',
  applecash: () => 'messages://',
  cash: null,
  other: null,
};

function RailPicker({
  value, onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      {RAILS.map((m) => {
        const on = m === value;
        return (
          <Press key={m} haptic="select" onPress={() => onChange(m)} style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.full,
                backgroundColor: on ? c.accentSoft : c.surfaceAlt,
                borderWidth: on ? 2 : 0,
                borderColor: c.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {m === 'cash' ? (
                <Icon name="cash" size={22} color={c.ink} />
              ) : (
                <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>
                  {PAYMENT_METHOD_LABEL[m].charAt(0)}
                </Txt>
              )}
            </View>
            <Txt variant="caption" color={on ? 'ink' : 'inkSecondary'} center>
              {PAYMENT_METHOD_LABEL[m]}
            </Txt>
          </Press>
        );
      })}
    </View>
  );
}

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
