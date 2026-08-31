import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cents, formatMoney, sum } from '@/lib/money.ts';
import { useEvent, useOwem } from '@/lib/store';
import type { Cents, TipPolicy } from '@/lib/types.ts';
import { radius, space, useColors } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Header, StepLabel, Title } from '@/components/ui/Header';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { TipRuler } from '@/components/ui/TipRuler';
import { Txt } from '@/components/ui/Txt';

const PERCENTS = [15, 18, 20, 25];

export default function Charges() {
  const c = useColors();
  const { id, receiptId } = useLocalSearchParams<{ id: string; receiptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, receipt, participants } = useEvent(id);
  const { setCharges } = useOwem();

  const subtotal = sum(items.map((i) => i.totalPrice));
  const [tip, setTip] = useState<Cents>(receipt && receipt.tip > 0 ? receipt.tip : cents(Math.round(subtotal * 0.2)));
  const [policy, setPolicy] = useState<TipPolicy>(receipt?.tipPolicy ?? 'PROPORTIONAL');
  const tax = receipt?.tax ?? cents(0);
  const total = cents(subtotal + tax + tip);
  const percent = subtotal > 0 ? Math.round((tip / subtotal) * 100) : 0;

  const adjustTip = useCallback(
    (deltaPercentPoints: number) => {
      setTip((prev) => {
        const pct = (prev / Math.max(1, subtotal)) * 100 + deltaPercentPoints;
        const clamped = Math.max(0, Math.min(40, pct));
        return cents(Math.round((subtotal * clamped) / 100));
      });
    },
    [subtotal],
  );

  const line = (label: string, value: Cents, strong = false) => (
    <View
      style={{
        height: strong ? 56 : 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space[4],
      }}
    >
      <Txt variant={strong ? 'bodyStrong' : 'callout'} color={strong ? 'ink' : 'inkSecondary'}>{label}</Txt>
      <Txt variant={strong ? 'title2' : 'callout'} tnum>{formatMoney(value)}</Txt>
    </View>
  );

  return (
    <Screen scroll bottomPad={96}>
      <Header right={<StepLabel step={4} of={5} />} />
      <Title text="Tax & tip" sub="Tax came off the receipt. The tip is yours." />

      <View style={{ paddingTop: space[6], gap: space[4] }}>
        <Txt variant="caption" color="inkSecondary" style={{ paddingHorizontal: space[4] }}>TIP</Txt>

        <TipRuler subtotal={subtotal} onAdjust={adjustTip} />

        <View style={{ alignItems: 'center', gap: space[1] }}>
          <Txt variant="displayXl" tnum>{formatMoney(tip)}</Txt>
          <Txt variant="footnote" color="inkSecondary">Drag the ruler, or pick a percentage</Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: space[2], paddingHorizontal: space[4] }}>
          {PERCENTS.map((p) => (
            <Chip
              key={p}
              flex
              label={`${p}%`}
              selected={percent === p}
              onPress={() => setTip(cents(Math.round((subtotal * p) / 100)))}
            />
          ))}
          <Chip flex label="None" selected={tip === 0} onPress={() => setTip(cents(0))} />
        </View>

        {/* Segmented control: the policy the engine will use. */}
        <View
          style={{
            marginHorizontal: space[4],
            height: 48,
            borderRadius: radius.full,
            backgroundColor: c.surfaceAlt,
            padding: 4,
            flexDirection: 'row',
            gap: 4,
          }}
        >
          {(['PROPORTIONAL', 'EQUAL'] as TipPolicy[]).map((p) => (
            <Press
              key={p}
              haptic="select"
              onPress={() => setPolicy(p)}
              style={{
                flex: 1,
                borderRadius: radius.full,
                backgroundColor: policy === p ? c.surface : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt variant="callout" style={{ fontWeight: policy === p ? '600' : '500' }}>
                {p === 'PROPORTIONAL' ? 'Split in proportion' : 'Split evenly'}
              </Txt>
            </Press>
          ))}
        </View>

        <Txt variant="footnote" color="inkSecondary" style={{ paddingHorizontal: space[4] }}>
          {policy === 'PROPORTIONAL'
            ? "Everyone's tip and tax scale with what they ordered."
            : `Tax and tip divide by ${participants.length}, whatever anyone had.`}
        </Txt>

        <Card style={{ marginHorizontal: space[4] }}>
          {line(`Subtotal · ${items.length} lines`, subtotal)}
          {line('Tax (from the receipt)', tax)}
          {line(`Tip (${percent}%)`, tip)}
          <View style={{ height: 0.5, backgroundColor: c.border, marginHorizontal: space[4] }} />
          {line('Total', total, true)}
        </Card>

        <View style={{ paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: insets.bottom }}>
          <Button
            label="Assign items"
            icon="arrowRight"
            onPress={() => {
              void setCharges(id, receiptId, { tip, tipPolicy: policy });
              router.push({ pathname: '/event/[id]/assign', params: { id, receiptId } });
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
