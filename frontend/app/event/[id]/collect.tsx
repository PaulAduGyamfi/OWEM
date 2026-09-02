import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cents, formatMoney } from '@/lib/money.ts';
import { formatShortDay } from '@/lib/format.ts';
import { paidBy, useEvent, useOwem } from '@/lib/store';
import { PAYMENT_METHOD_LABEL } from '@/lib/types.ts';
import { radius, space, useColors, useTheme } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Grouped, Row } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/Progress';
import { Press } from '@/components/ui/Pressable';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { RecordPaymentSheet } from '@/components/owem/RecordPaymentSheet';
import { RequestSheet } from '@/components/owem/RequestSheet';

export default function Collect() {
  const c = useColors();
  const { scheme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { s, createPayment } = useOwem();
  const { event, settlement, participants, payer, summary, payments } = useEvent(id);
  const [asking, setAsking] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);

  if (!event || !settlement || !summary) return <Screen><Header /></Screen>;

  const cardBg = scheme === 'dark' ? c.surfaceAlt : c.ink;
  const cardFg = scheme === 'dark' ? c.ink : c.onInk;
  const cardMuted = scheme === 'dark' ? c.inkSecondary : 'rgba(255,255,255,0.6)';

  const rows = settlement.lines
    .filter((l) => l.participantId !== payer?.id)
    .map((l) => {
      const person = participants.find((p) => p.id === l.participantId);
      if (!person) return null;
      const paid = paidBy(s, id, l.participantId);
      const last = payments.filter((p) => p.participantId === l.participantId).at(-1);
      return { person, owed: l.amountOwed, paid, left: cents(Math.max(0, l.amountOwed - paid)), last };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.left - a.left);

  const target = rows.find((r) => r.person.id === (asking ?? recording));
  const collected = summary.collected;
  const progress = summary.owedToPayer === 0 ? 1 : collected / summary.owedToPayer;

  return (
    <Screen>
      <Header
        right={
          <Press onPress={() => router.push({ pathname: '/event/[id]/settlement', params: { id } })}>
            <Icon name="receipt" size={22} color={c.ink} />
          </Press>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: space[4], gap: space[1] }}>
          <Txt variant="title1">Collect</Txt>
          <Txt variant="body" color="inkSecondary">
            {event.title} · {formatShortDay(event.occurredAt)}
          </Txt>
        </View>

        <View
          style={{
            margin: space[4],
            padding: space[5],
            borderRadius: radius.xl,
            backgroundColor: cardBg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Txt variant="footnote" style={{ color: cardMuted }}>Still out</Txt>
              <Txt variant="displayLg" tnum style={{ color: cardFg }}>{formatMoney(summary.outstanding)}</Txt>
            </View>
            <Txt variant="footnote" tnum style={{ color: cardMuted, textAlign: 'right' }}>
              {formatMoney(collected)} in{'\n'}of {formatMoney(summary.owedToPayer)}
            </Txt>
          </View>
          <View style={{ marginTop: space[4] }}>
            <ProgressBar value={progress} tint={c.positive} />
          </View>
        </View>

        <View style={{ paddingHorizontal: space[4], gap: space[4] }}>
          <Grouped inset={68}>
            {rows.map((r) => {
              const settled = r.left === 0;
              return (
                <Row key={r.person.id} height={76}>
                  <Press
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]/participant/[pid]',
                        params: { id, pid: r.person.id },
                      })
                    }
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 }}
                  >
                    <Avatar name={r.person.displayName} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong" color={settled ? 'inkSecondary' : 'ink'}>
                        {r.person.displayName}
                      </Txt>
                      <Txt variant="footnote" color="inkSecondary" tnum numberOfLines={1}>
                        {settled
                          ? `${formatMoney(r.owed)} · ${r.last ? PAYMENT_METHOD_LABEL[r.last.method] : 'recorded'} · ${r.last ? formatShortDay(r.last.recordedAt) : ''}`
                          : r.paid > 0
                            ? `${formatMoney(r.left)} left of ${formatMoney(r.owed)}`
                            : formatMoney(r.owed)}
                      </Txt>
                    </View>
                  </Press>

                  {settled ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={14} color={c.positive} strokeWidth={3} />
                      <Txt variant="footnote" style={{ fontWeight: '600', color: c.positiveText }}>Paid</Txt>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'flex-end', gap: space[1] }}>
                      <Button
                        label={r.paid > 0 ? 'Ask again' : 'Ask'}
                        variant="ink"
                        size="compact"
                        onPress={() => setAsking(r.person.id)}
                      />
                      <Press onPress={() => setRecording(r.person.id)}>
                        <Txt variant="footnote" color="inkSecondary" style={{ fontWeight: '600' }}>Mark paid</Txt>
                      </Press>
                    </View>
                  )}
                </Row>
              );
            })}
          </Grouped>

          {rows.some((r) => r.paid > 0 && r.left > 0) && (
            <Txt variant="footnote" color="inkSecondary">
              A part payment counts against what they owe. The rest stays out until it lands.
            </Txt>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[4], gap: space[3] }}>
        {summary.outstanding === 0 ? (
          <Button
            label="Everyone's square"
            onPress={() => router.push({ pathname: '/event/[id]/settled', params: { id } })}
          />
        ) : (
          <Button
            label={`Nudge the ${rows.filter((r) => r.left > 0).length} who owe`}
            iconLeft="bell"
            onPress={() => router.push({ pathname: '/event/[id]/reminders', params: { id } })}
          />
        )}
      </View>

      <RequestSheet
        participant={target?.person ?? null}
        amount={target?.left ?? cents(0)}
        eventTitle={event.title}
        open={asking !== null}
        onClose={() => setAsking(null)}
        onSeeBreakdown={() => {
          const pid = asking;
          setAsking(null);
          if (pid) router.push({ pathname: '/event/[id]/participant/[pid]', params: { id, pid } });
        }}
      />
      <RecordPaymentSheet
        participant={target?.person ?? null}
        owed={target?.left ?? cents(0)}
        open={recording !== null}
        width={width - space[5] * 2}
        onClose={() => setRecording(null)}
        onRecord={(amount, method) => {
          if (recording) createPayment(id, recording, amount, method);
          setRecording(null);
        }}
      />
    </Screen>
  );
}
