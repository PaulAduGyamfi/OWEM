import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allocate, cents, formatMoney } from '@/lib/money.ts';
import { formatShortDay, percentOf } from '@/lib/format.ts';
import { assignmentsOf, lineFor, paidBy, useEvent, useOwem } from '@/lib/store';
import { space, useColors } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonRow } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Money } from '@/components/ui/Money';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { RecordPaymentSheet } from '@/components/owem/RecordPaymentSheet';
import { RequestSheet } from '@/components/owem/RequestSheet';
import { Banner } from '@/components/owem/Provenance';

export default function Breakdown() {
  const c = useColors();
  const { id, pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { s, createPayment } = useOwem();
  const { event, items, settlement, participants } = useEvent(id);
  const [asking, setAsking] = useState(false);
  const [recording, setRecording] = useState(false);

  const person = participants.find((p) => p.id === pid);
  const line = lineFor(settlement, pid);
  if (!person || !line || !event || !settlement) return <Screen><Header /></Screen>;

  const paid = paidBy(s, id, pid);
  const left = cents(Math.max(0, line.amountOwed - paid));

  const had = items
    .map((item) => {
      const on = assignmentsOf(s, id, item.id);
      const mine = on.findIndex((a) => a.participantId === pid);
      if (mine < 0) return null;
      const shares = allocate(item.totalPrice, on.map((a) => a.weight));
      return {
        id: item.id,
        name: item.normalizedName,
        share: shares[mine],
        note: on.length > 1 ? `${on[mine].weight} of ${on.reduce((t, a) => t + a.weight, 0)}` : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const liveSubtotal = had.reduce((a, h) => a + h.share, 0);
  const staleBy = cents(liveSubtotal - line.itemsSubtotal);

  const row = (label: string, value: React.ReactNode, note?: string | null, strong = false) => (
    <View
      style={{
        height: strong ? 48 : 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: space[4],
      }}
    >
      <Txt variant={strong ? 'bodyStrong' : 'callout'} color={strong ? 'ink' : 'inkSecondary'}>
        {label}
        {note ? <Txt variant="callout" color="inkTertiary"> · {note}</Txt> : null}
      </Txt>
      {value}
    </View>
  );

  return (
    <Screen>
      <Header right={<Badge label={`VERSION ${settlement.version}`} tone="neutral" />} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <Avatar name={person.displayName} size={56} payer={person.isPayer} />
          <View>
            <Txt variant="title2">{person.displayName}</Txt>
            <Txt variant="footnote" color="inkSecondary">
              {event.title} · {formatShortDay(event.occurredAt)}
            </Txt>
          </View>
        </View>

        <View style={{ paddingHorizontal: space[4], paddingTop: space[5] }}>
          <Money value={left} variant="displayLg" />
          <Txt variant="footnote" color="inkSecondary">
            {person.isPayer ? 'was their own share' : paid > 0 ? `left of ${formatMoney(line.amountOwed)}` : 'owes you'}
          </Txt>
        </View>

        <View style={{ padding: space[4], gap: space[4] }}>
          <Txt variant="caption" color="inkSecondary">WHAT {person.displayName.toUpperCase()} HAD</Txt>
          {staleBy !== 0 && (
            <Banner
              tone="warning"
              text={`These lines have changed since version ${settlement.version} was locked — they now come to ${formatMoney(cents(liveSubtotal))}. The total below is what ${person.displayName} was actually told. Re-run the balances to make a new version.`}
            />
          )}
          <Card style={{ paddingVertical: space[2] }}>
            {had.map((h) => (
              <View key={h.id}>{row(h.name, <Money value={h.share} />, h.note)}</View>
            ))}
          </Card>

          <Card style={{ paddingVertical: space[2] }}>
            {row('Food and drink', <Money value={line.itemsSubtotal} />)}
            {row('Share of tax', <Money value={line.taxShare} />)}
            {row('Share of tip', <Money value={line.tipShare} />)}
            <View style={{ height: 0.5, backgroundColor: c.border, marginHorizontal: space[4], marginVertical: 6 }} />
            {row(`${person.displayName} owes`, <Money value={line.amountOwed} variant="title2" />, null, true)}
          </Card>

          <Txt variant="footnote" color="inkSecondary">
            Tax and tip follow what they ordered:{' '}
            {percentOf(line.itemsSubtotal, settlement.lines.reduce((a, l) => a + l.itemsSubtotal, 0))} of the food,
            so the same share of both.
          </Txt>
        </View>
      </ScrollView>

      {!person.isPayer && left > 0 && (
        <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4] }}>
          <ButtonRow>
            <Button label="Mark paid" variant="secondary" flex onPress={() => setRecording(true)} />
            <Button label="Request" flex onPress={() => setAsking(true)} />
          </ButtonRow>
        </View>
      )}

      <RequestSheet
        participant={person}
        amount={left}
        eventTitle={event.title}
        open={asking}
        onClose={() => setAsking(false)}
        onSeeBreakdown={() => setAsking(false)}
      />
      <RecordPaymentSheet
        participant={person}
        owed={left}
        open={recording}
        width={width - space[5] * 2}
        onClose={() => setRecording(false)}
        onRecord={(amount, method) => {
          createPayment(id, pid, amount, method);
          setRecording(false);
          router.back();
        }}
      />
    </Screen>
  );
}
